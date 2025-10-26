import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import type { Reporter } from '@wpkernel/core/reporter';
import { createPhpBuilder } from '../builder';
import type { BuilderOutput } from '../../../runtime/types';
import { buildWorkspace } from '../../../workspace';
import { withWorkspace } from '@wpkernel/test-utils/integration';
import { makePhpIrFixture } from '@wpkernel/test-utils/next/builders/php/resources.test-support';
import * as phpDriver from '@wpkernel/php-driver';
import * as legacyBaseController from '../../../../printers/php/base-controller';
import * as legacyResourceController from '../../../../printers/php/resource-controller';
import * as legacyPolicyHelper from '../../../../printers/php/policy-helper';
import * as legacyPersistenceRegistry from '../../../../printers/php/persistence-registry';
import * as legacyIndexFile from '../../../../printers/php/index-file';
import * as legacyWriter from '../../../../printers/php/writer';

type LegacySpy = {
	readonly name: string;
	readonly spy: jest.SpyInstance;
};

function normalisePhpValue(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(normalisePhpValue);
	}

	if (value && typeof value === 'object') {
		const node = value as Record<string, unknown>;
		const next: Record<string, unknown> = {};

		for (const [key, entry] of Object.entries(node)) {
			next[key] = normalisePhpValue(entry);
		}

		if (node.nodeType === 'Name' && Array.isArray(node.parts)) {
			const parts = node.parts as unknown[];
			const resolved = parts
				.map((part) => {
					if (typeof part === 'string') {
						return part;
					}

					if (part && typeof part === 'object') {
						const candidate = part as { name?: string };
						if (typeof candidate.name === 'string') {
							return candidate.name;
						}
					}

					return String(part ?? '');
				})
				.join('\\');

			next.name = resolved;
		}

		if (node.nodeType === 'Param' && !('hooks' in next)) {
			next.hooks = [];
		}

		return next;
	}

	return value;
}

function createReporterStub(): Reporter {
	return {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		child: jest.fn().mockReturnThis(),
	};
}

const legacyPrinterSpies: LegacySpy[] = [
	{
		name: 'base-controller printer',
		spy: jest.spyOn(legacyBaseController, 'createBaseControllerBuilder'),
	},
	{
		name: 'resource-controller printer',
		spy: jest.spyOn(
			legacyResourceController,
			'createResourceControllerArtifact'
		),
	},
	{
		name: 'policy helper printer',
		spy: jest.spyOn(legacyPolicyHelper, 'createPolicyHelperBuilder'),
	},
	{
		name: 'persistence registry printer',
		spy: jest.spyOn(
			legacyPersistenceRegistry,
			'createPersistenceRegistryBuilder'
		),
	},
	{
		name: 'index file printer',
		spy: jest.spyOn(legacyIndexFile, 'createPhpIndexFile'),
	},
	{
		name: 'legacy writer',
		spy: jest.spyOn(legacyWriter, 'writePhpArtifact'),
	},
];

const CLI_VENDOR_ROOT = path.resolve(__dirname, '../../../../../vendor');

afterEach(() => {
	for (const entry of legacyPrinterSpies) {
		entry.spy.mockClear();
	}
});

afterAll(() => {
	for (const entry of legacyPrinterSpies) {
		entry.spy.mockRestore();
	}
});

describe('createPhpBuilder integration', () => {
	it('emits PHP + AST artefacts via the PHP driver without touching legacy printers', async () => {
		const ir = makePhpIrFixture();
		const builder = createPhpBuilder();
		const reporter = createReporterStub();
		const queuedWrites: BuilderOutput['actions'] = [];
		const output: BuilderOutput = {
			actions: queuedWrites,
			queueWrite(action) {
				queuedWrites.push(action);
			},
		};

		const artefacts = new Map<string, string>();
		let workspaceRoot: string | null = null;

		const prettyPrinterSpy = jest
			.spyOn(phpDriver, 'buildPhpPrettyPrinter')
			.mockImplementation((options) => {
				const scriptPath =
					options.scriptPath ??
					phpDriver.resolvePrettyPrintScriptPath();
				const phpBinary = options.phpBinary ?? 'php';

				return {
					async prettyPrint(payload) {
						const normalisedProgram = normalisePhpValue(
							payload.program
						);
						const input = JSON.stringify({
							file: payload.filePath,
							ast: normalisedProgram,
						});
						const result = spawnSync(
							phpBinary,
							[
								'-d',
								'memory_limit=1024M',
								scriptPath,
								options.workspace.root,
								payload.filePath,
							],
							{
								input,
								encoding: 'utf8',
							}
						);

						if (result.error) {
							throw result.error;
						}

						if (result.status !== 0) {
							throw new Error(
								`PHP pretty print failed (${result.status}): ${
									result.stderr || result.stdout
								}`
							);
						}

						try {
							const stdout = result.stdout.trim();
							const jsonStart = stdout.indexOf('{');
							const parsedPayload =
								jsonStart === -1
									? stdout
									: stdout.slice(jsonStart);
							return JSON.parse(
								parsedPayload
							) as phpDriver.PhpPrettyPrintResult;
						} catch (_error) {
							throw new Error(
								`Failed to parse pretty print output: ${result.stdout}`
							);
						}
					},
				} satisfies phpDriver.PhpPrettyPrinter;
			});

		try {
			await withWorkspace(async (workspacePath) => {
				const workspace = buildWorkspace(workspacePath);
				workspaceRoot = workspace.root;
				await fs.cp(CLI_VENDOR_ROOT, workspace.resolve('vendor'), {
					recursive: true,
				});
				await fs.access(workspace.resolve('vendor', 'autoload.php'));
				await fs.access(
					workspace.resolve(
						'vendor',
						'nikic',
						'php-parser',
						'lib',
						'PhpParser',
						'JsonDecoder.php'
					)
				);
				const toRelative = (absolute: string): string => {
					if (!workspaceRoot) {
						throw new Error('Workspace root not initialised.');
					}

					const relative = path
						.relative(workspaceRoot, absolute)
						.split(path.sep)
						.join('/');
					return relative === '' ? '.' : relative;
				};

				const captureArtefact = async (
					...segments: string[]
				): Promise<void> => {
					const phpPath = workspace.resolve(...segments);
					const phpContents = await fs.readFile(phpPath, 'utf8');
					artefacts.set(toRelative(phpPath), phpContents);

					const astPath = `${phpPath}.ast.json`;
					const astContents = await fs.readFile(astPath, 'utf8');
					artefacts.set(toRelative(astPath), astContents);
				};

				await builder.apply(
					{
						context: {
							workspace,
							reporter,
							phase: 'generate',
						},
						input: {
							phase: 'generate',
							options: {
								config: ir.config,
								namespace: ir.meta.namespace,
								origin: ir.meta.origin,
								sourcePath: ir.meta.sourcePath,
							},
							ir,
						},
						output,
						reporter,
					},
					undefined
				);

				await captureArtefact(
					ir.php.outputDir,
					'Rest',
					'BaseController.php'
				);
				await captureArtefact(
					ir.php.outputDir,
					'Rest',
					'BooksController.php'
				);
				await captureArtefact(
					ir.php.outputDir,
					'Rest',
					'JobCategoriesController.php'
				);
				await captureArtefact(
					ir.php.outputDir,
					'Rest',
					'DemoOptionController.php'
				);
				await captureArtefact(ir.php.outputDir, 'Policy', 'Policy.php');
				await captureArtefact(
					ir.php.outputDir,
					'Registration',
					'PersistenceRegistry.php'
				);
				await captureArtefact(ir.php.outputDir, 'index.php');
			});
		} finally {
			prettyPrinterSpy.mockRestore();
		}

		if (!workspaceRoot) {
			throw new Error('Expected workspace root to be captured.');
		}

		const normalise = (absolutePath: string): string =>
			path
				.relative(workspaceRoot!, absolutePath)
				.split(path.sep)
				.join('/');

		const expectedFiles = [
			'.generated/php/Policy/Policy.php',
			'.generated/php/Policy/Policy.php.ast.json',
			'.generated/php/Registration/PersistenceRegistry.php',
			'.generated/php/Registration/PersistenceRegistry.php.ast.json',
			'.generated/php/Rest/BaseController.php',
			'.generated/php/Rest/BaseController.php.ast.json',
			'.generated/php/Rest/BooksController.php',
			'.generated/php/Rest/BooksController.php.ast.json',
			'.generated/php/Rest/JobCategoriesController.php',
			'.generated/php/Rest/JobCategoriesController.php.ast.json',
			'.generated/php/Rest/DemoOptionController.php',
			'.generated/php/Rest/DemoOptionController.php.ast.json',
			'.generated/php/index.php',
			'.generated/php/index.php.ast.json',
		].sort();

		expect(Array.from(artefacts.keys()).sort()).toEqual(expectedFiles);

		const queuedRelativeFiles = queuedWrites
			.map((action) => normalise(action.file))
			.sort();
		expect(queuedRelativeFiles).toEqual(expectedFiles);

		for (const action of queuedWrites) {
			const relative = normalise(action.file);
			const contents = artefacts.get(relative);
			expect(contents).toBeDefined();
			expect(action.contents).toBe(contents);
		}

		expect(reporter.info).toHaveBeenCalledWith(
			'createPhpBuilder: PHP artifacts generated.'
		);

		const baseControllerPhp = artefacts.get(
			'.generated/php/Rest/BaseController.php'
		);
		expect(baseControllerPhp).toBeDefined();
		expect(baseControllerPhp).toMatchSnapshot('base-controller.php');

		const booksControllerPhp = artefacts.get(
			'.generated/php/Rest/BooksController.php'
		);
		expect(booksControllerPhp).toBeDefined();
		expect(booksControllerPhp).toMatchSnapshot('books-controller.php');

		const demoOptionControllerPhp = artefacts.get(
			'.generated/php/Rest/DemoOptionController.php'
		);
		expect(demoOptionControllerPhp).toBeDefined();
		expect(demoOptionControllerPhp).toMatchSnapshot(
			'demo-option-controller.php'
		);

		const policyHelperPhp = artefacts.get(
			'.generated/php/Policy/Policy.php'
		);
		expect(policyHelperPhp).toBeDefined();
		expect(policyHelperPhp).toMatchSnapshot('policy-helper.php');

		const baseControllerAst = artefacts.get(
			'.generated/php/Rest/BaseController.php.ast.json'
		);
		expect(baseControllerAst).toBeDefined();
		const parsedAst = JSON.parse(baseControllerAst as string);
		expect(Array.isArray(parsedAst)).toBe(true);
		const topLevelNodeTypes = parsedAst.map(
			(node: { readonly nodeType?: string }) => node.nodeType
		);
		expect(topLevelNodeTypes).toEqual(['Stmt_Declare', 'Stmt_Namespace']);

		for (const entry of legacyPrinterSpies) {
			expect(entry.spy).not.toHaveBeenCalled();
		}
	});
});
