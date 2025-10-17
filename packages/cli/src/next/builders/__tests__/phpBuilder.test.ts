import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createNoopReporter } from '@wpkernel/core/reporter';
import type { IRv1 } from '../../../ir/types';
import { createWorkspace } from '../../workspace';
import { createPhpBuilder } from '../php';
import type { BuilderOutput, BuilderWriteAction } from '../../runtime/types';
import type {
	PhpPrettyPrintOptions,
	PhpPrettyPrintResult,
} from '../../../printers/types';

const execFileAsync = promisify(execFile);

jest.setTimeout(60000);

jest.mock('../phpBridge', () => {
	const prettyPrint = jest.fn(
		async (
			payload: PhpPrettyPrintOptions
		): Promise<PhpPrettyPrintResult> => {
			const code = typeof payload.code === 'string' ? payload.code : '';
			const hasNamespace = /namespace\s+[^\s;]+;/u.test(code);

			return {
				code,
				ast: hasNamespace
					? [
							{
								nodeType: 'Stmt_Namespace',
								attributes: {},
								name: code.match(
									/namespace\s+([^\s;]+);/u
								)?.[1],
							},
						]
					: [],
			};
		}
	);

	return {
		createPhpPrettyPrinter: jest.fn(() => ({
			prettyPrint,
		})),
	};
});

describe('createPhpBuilder', () => {
	const builder = createPhpBuilder();

	const ir: IRv1 = {
		meta: {
			version: 1,
			namespace: 'demo-plugin',
			sanitizedNamespace: 'DemoPlugin',
			origin: 'kernel.config.ts',
			sourcePath: 'kernel.config.ts',
		},
		config: {
			version: 1,
			namespace: 'demo-plugin',
			schemas: {},
			resources: {},
		} as IRv1['config'],
		schemas: [],
		resources: [],
		policies: [],
		policyMap: {
			sourcePath: undefined,
			definitions: [],
			fallback: {
				capability: 'manage_options',
				appliesTo: 'resource',
			},
			missing: [],
			unused: [],
			warnings: [],
		},
		blocks: [],
		php: {
			namespace: 'Demo\\Plugin',
			autoload: 'inc/',
			outputDir: '.generated/php',
		},
	};

	async function withWorkspace<T>(
		run: (root: string) => Promise<T>
	): Promise<T> {
		const root = await fs.mkdtemp(
			path.join(os.tmpdir(), 'php-builder-workspace-')
		);

		try {
			return await run(root);
		} finally {
			await fs.rm(root, { recursive: true, force: true });
		}
	}

	it('writes PHP artifacts and records manifest entries', async () => {
		await withWorkspace(async (workspaceRoot) => {
			await fs.writeFile(
				path.join(workspaceRoot, ir.meta.sourcePath),
				'// config placeholder\n'
			);
			const workspace = createWorkspace(workspaceRoot);
			const reporter = createNoopReporter();
			const queueWrite = jest.fn<void, [BuilderWriteAction]>();
			const output: BuilderOutput = {
				actions: [],
				queueWrite,
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
							sourcePath: path.join(
								workspaceRoot,
								ir.meta.sourcePath
							),
						},
						ir,
					},
					output,
					reporter,
				},
				undefined
			);

			const baseControllerPath = path.join(
				workspaceRoot,
				'.generated',
				'php',
				'Rest',
				'BaseController.php'
			);

			const controllerExists = await fs.readFile(
				baseControllerPath,
				'utf8'
			);

			expect(controllerExists).toContain('class BaseController');
			expect(controllerExists).toMatch(/declare\s*\(strict_types=1\);/);
			expect(queueWrite).toHaveBeenCalled();
			const queuedFiles = queueWrite.mock.calls.map(
				([action]) => action.file
			);
			expect(queuedFiles).toContain(
				path.join('.generated', 'php', 'Rest', 'BaseController.php')
			);

			const astPath = path.join(
				workspaceRoot,
				'.generated',
				'php',
				'Rest',
				'BaseController.php.ast.json'
			);
			const astContents = await fs.readFile(astPath, 'utf8');
			const astJson = JSON.parse(astContents);
			expect(Array.isArray(astJson)).toBe(true);
			expect(astJson).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						nodeType: 'Stmt_Namespace',
					}),
				])
			);
			expect(queuedFiles).toContain(
				path.join(
					'.generated',
					'php',
					'Rest',
					'BaseController.php.ast.json'
				)
			);

			const lintResult = await execFileAsync('php', [
				'-l',
				baseControllerPath,
			]);
			expect(lintResult.stdout).toContain('No syntax errors');
		});
	});
});
