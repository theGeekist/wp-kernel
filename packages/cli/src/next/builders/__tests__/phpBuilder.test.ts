import path from 'node:path';
import type { Reporter } from '@wpkernel/core/reporter';
import type { IRv1 } from '../../../ir/types';
import {
	createPhpBuilder,
	createPhpChannelHelper,
	createPhpBaseControllerHelper,
	createPhpResourceControllerHelper,
	createPhpPolicyHelper,
	createPhpPersistenceRegistryHelper,
	createPhpIndexFileHelper,
	getPhpBuilderChannel,
} from '../php';
import type { BuilderOutput } from '../../runtime/types';
import type { Workspace } from '../../workspace/types';
import { buildPhpPrettyPrinter } from '@wpkernel/php-driver';
import { makeWorkspaceMock } from '../../../../tests/workspace.test-support';

jest.mock('@wpkernel/php-driver', () => ({
	buildPhpPrettyPrinter: jest.fn(() => ({
		prettyPrint: jest.fn(async ({ program }) => ({
			code: '<?php\n// pretty printed base controller\n',
			ast: program,
		})),
	})),
}));

const buildPhpPrettyPrinterMock = buildPhpPrettyPrinter as jest.MockedFunction<
	typeof buildPhpPrettyPrinter
>;

function buildReporter(): Reporter {
	return {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		child: jest.fn().mockReturnThis(),
	};
}

function buildWorkspace(): Workspace {
	return makeWorkspaceMock({
		root: process.cwd(),
		cwd: jest.fn(() => process.cwd()),
		read: jest.fn(async () => null),
		readText: jest.fn(async () => null),
		write: jest.fn(async () => undefined),
		writeJson: jest.fn(async () => undefined),
		exists: jest.fn(async () => false),
		rm: jest.fn(async () => undefined),
		glob: jest.fn(async () => []),
		threeWayMerge: jest.fn(async () => 'clean'),
		begin: jest.fn(),
		commit: jest.fn(async () => ({ writes: [], deletes: [] })),
		rollback: jest.fn(async () => ({ writes: [], deletes: [] })),
		dryRun: async <T>(fn: () => Promise<T>) => ({
			result: await fn(),
			manifest: { writes: [], deletes: [] },
		}),
		tmpDir: jest.fn(async () => '.tmp'),
		resolve: jest.fn((...parts: string[]) =>
			path.join(process.cwd(), ...parts)
		),
	});
}

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

function setupPrettyPrinterMock() {
	const prettyPrint = jest.fn(async ({ program }) => ({
		code: '<?php\n// pretty printed base controller\n',
		ast: program,
	}));
	buildPhpPrettyPrinterMock.mockReturnValueOnce({ prettyPrint });
	return prettyPrint;
}

describe('createPhpBuilder', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('queues helper programs in the channel before writing', async () => {
		const workspace = buildWorkspace();
		const reporter = buildReporter();
		const context = {
			workspace,
			reporter,
			phase: 'generate' as const,
		};
		const queueWrite = jest.fn();
		const output: BuilderOutput = {
			actions: [],
			queueWrite,
		};

		const helpers = [
			createPhpChannelHelper(),
			createPhpBaseControllerHelper(),
			createPhpResourceControllerHelper(),
			createPhpPolicyHelper(),
			createPhpPersistenceRegistryHelper(),
			createPhpIndexFileHelper(),
		];

		const applyOptions = {
			context,
			input: {
				phase: 'generate' as const,
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
		};

		for (const helper of helpers) {
			await helper.apply(applyOptions, undefined);
		}

		const channel = getPhpBuilderChannel(context);
		const pending = channel.pending();
		expect(pending).toHaveLength(4);

		const baseEntry = pending.find(
			(entry) => entry.metadata.kind === 'base-controller'
		);
		expect(baseEntry).toBeDefined();
		expect(baseEntry?.docblock).toEqual(
			expect.arrayContaining([
				expect.stringContaining('Source: kernel.config.ts → resources'),
			])
		);
		expect(baseEntry?.program[0]?.nodeType).toBe('Stmt_Declare');

		const policyEntry = pending.find(
			(entry) => entry.metadata.kind === 'policy-helper'
		);
		expect(policyEntry).toBeDefined();
		expect(policyEntry?.statements).toHaveLength(0);

		const namespaceNode = policyEntry?.program.find(
			(stmt) => stmt?.nodeType === 'Stmt_Namespace'
		) as { stmts?: unknown[] } | undefined;
		expect(namespaceNode).toBeDefined();

		const classNode = namespaceNode?.stmts?.find(
			(stmt: any) => stmt?.nodeType === 'Stmt_Class'
		) as { stmts?: unknown[]; name?: { name?: string } } | undefined;
		expect(classNode?.name?.name).toBe('Policy');

		const methodNames =
			classNode?.stmts
				?.filter((stmt: any) => stmt?.nodeType === 'Stmt_ClassMethod')
				.map((method: any) => method?.name?.name) ?? [];
		expect(methodNames).toEqual([
			'policy_map',
			'fallback',
			'callback',
			'enforce',
		]);

		const enforceMethod = classNode?.stmts?.find(
			(stmt: any) =>
				stmt?.nodeType === 'Stmt_ClassMethod' &&
				stmt?.name?.name === 'enforce'
		) as { stmts?: any[] } | undefined;
		expect(enforceMethod?.stmts?.[0]?.nodeType).toBe('Stmt_Nop');
		expect(
			enforceMethod?.stmts?.[0]?.attributes?.comments?.[0]?.text
		).toContain('TODO: Implement policy enforcement logic');

		const enforceReturn = enforceMethod?.stmts?.find(
			(stmt: any) => stmt?.nodeType === 'Stmt_Return'
		);
		expect(enforceReturn?.expr?.nodeType).toBe('Expr_New');
		expect(enforceReturn?.expr?.class?.parts).toEqual(['WP_Error']);

		const indexEntry = pending.find(
			(entry) => entry.metadata.kind === 'index-file'
		);
		expect(indexEntry?.program[1]?.nodeType).toBe('Stmt_Namespace');
	});

	it('logs a debug message and skips non-generate phases', async () => {
		const builder = createPhpBuilder();
		const reporter = buildReporter();
		const workspace = buildWorkspace();
		const queueWrite = jest.fn();
		const output: BuilderOutput = {
			actions: [],
			queueWrite,
		};

		await builder.apply(
			{
				context: {
					workspace,
					reporter,
					phase: 'init',
				},
				input: {
					phase: 'init',
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

		expect(reporter.debug).toHaveBeenCalledWith(
			'createPhpBuilder: skipping phase.',
			{ phase: 'init' }
		);
		expect(reporter.info).not.toHaveBeenCalled();
		expect(queueWrite).not.toHaveBeenCalled();
	});

	it('generates base controller artifacts from the AST channel', async () => {
		const builder = createPhpBuilder();
		const reporter = buildReporter();
		const workspace = buildWorkspace();
		const prettyPrint = setupPrettyPrinterMock();
		const queueWrite = jest.fn();
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
						sourcePath: ir.meta.sourcePath,
					},
					ir,
				},
				output,
				reporter,
			},
			undefined
		);

		const baseControllerPath = workspace.resolve(
			ir.php.outputDir,
			'Rest',
			'BaseController.php'
		);

		expect(prettyPrint).toHaveBeenCalledTimes(4);
		const baseControllerCall = prettyPrint.mock.calls.find(
			([payload]) => payload.filePath === baseControllerPath
		);
		expect(baseControllerCall).toBeDefined();
		expect(baseControllerCall?.[0].program).toMatchSnapshot(
			'base-controller-ast'
		);

		expect(workspace.write).toHaveBeenCalledWith(
			baseControllerPath,
			expect.any(String),
			{
				ensureDir: true,
			}
		);
		const astPath = `${baseControllerPath}.ast.json`;
		expect(workspace.write).toHaveBeenCalledWith(
			astPath,
			expect.any(String),
			{
				ensureDir: true,
			}
		);

		expect(queueWrite).toHaveBeenCalledWith({
			file: baseControllerPath,
			contents: '<?php\n// pretty printed base controller\n',
		});
		expect(queueWrite).toHaveBeenCalledWith({
			file: astPath,
			contents: expect.stringMatching(/"Stmt_Class"/),
		});

		expect(reporter.info).toHaveBeenCalledWith(
			'createPhpBuilder: PHP artifacts generated.'
		);
	});
});
