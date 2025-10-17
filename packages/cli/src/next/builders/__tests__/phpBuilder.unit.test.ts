import path from 'node:path';
import type { Reporter } from '@wpkernel/core/reporter';
import type { IRv1 } from '../../../ir/types';
import type { Workspace } from '../../workspace/types';
import type { BuilderOutput } from '../../runtime/types';

const reporter: Reporter = {
	debug: jest.fn(),
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
	child: jest.fn().mockReturnThis(),
};

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

const builderInput = {
	phase: 'generate' as const,
	options: {
		config: ir.config,
		namespace: ir.meta.namespace,
		origin: ir.meta.origin,
		sourcePath: path.join(process.cwd(), ir.meta.sourcePath),
	},
	ir,
};

afterEach(() => {
	jest.resetModules();
	jest.clearAllMocks();
});

async function importBuilder() {
	const module = await import('../php');
	return module.createPhpBuilder();
}

function createWorkspace(overrides: Partial<Workspace> = {}): Workspace {
	return {
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
		dryRun: jest.fn(async (fn) => ({
			result: await fn(),
			manifest: { writes: [], deletes: [] },
		})),
		tmpDir: jest.fn(async () => path.join(process.cwd(), '.tmp')),
		resolve: jest.fn((...parts: string[]) =>
			path.join(process.cwd(), ...parts)
		),
		...overrides,
	} as unknown as Workspace;
}

describe('createPhpBuilder (unit)', () => {
	it('rolls back workspace changes when PHP artifact emission fails', async () => {
		const emitPhpArtifacts = jest
			.fn()
			.mockRejectedValue(new Error('emit failed'));
		const prettyPrint = jest
			.fn()
			.mockResolvedValue({ code: '<?php', ast: [] });

		jest.doMock('../../../printers/php/printer', () => ({
			emitPhpArtifacts,
		}));

		jest.doMock('../phpBridge', () => ({
			createPhpPrettyPrinter: () => ({ prettyPrint }),
		}));

		const workspace = createWorkspace();
		const output: BuilderOutput = {
			actions: [],
			queueWrite: jest.fn(),
		};

		const builder = await importBuilder();

		await expect(
			builder.apply(
				{
					context: {
						workspace,
						reporter,
						phase: 'generate',
					},
					input: builderInput,
					output,
					reporter,
				},
				undefined
			)
		).rejects.toThrow('emit failed');

		expect(workspace.begin).toHaveBeenCalledWith(
			'builder.generate.php.core'
		);
		expect(workspace.rollback).toHaveBeenCalledWith(
			'builder.generate.php.core'
		);
		expect(workspace.commit).not.toHaveBeenCalled();
		expect(output.queueWrite).not.toHaveBeenCalled();
	});

	it('queues manifest writes only when workspace artifacts exist', async () => {
		const emitPhpArtifacts = jest.fn().mockResolvedValue(undefined);
		const prettyPrint = jest
			.fn()
			.mockResolvedValue({ code: '<?php', ast: [] });
		const presentContents = Buffer.from('present');

		jest.doMock('../../../printers/php/printer', () => ({
			emitPhpArtifacts,
		}));

		jest.doMock('../phpBridge', () => ({
			createPhpPrettyPrinter: () => ({ prettyPrint }),
		}));

		const readMock = jest
			.fn<Workspace['read']>()
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(presentContents);

		const workspace = createWorkspace({
			read: readMock,
			commit: jest.fn(async () => ({
				writes: ['missing.php', 'present.php'],
				deletes: [],
			})),
		});

		const output: BuilderOutput = {
			actions: [],
			queueWrite: jest.fn(),
		};

		const builder = await importBuilder();

		await builder.apply(
			{
				context: {
					workspace,
					reporter,
					phase: 'generate',
				},
				input: builderInput,
				output,
				reporter,
			},
			undefined
		);

		expect(emitPhpArtifacts).toHaveBeenCalled();
		expect(workspace.commit).toHaveBeenCalledWith(
			'builder.generate.php.core'
		);
		expect(output.queueWrite).toHaveBeenCalledTimes(1);
		expect(output.queueWrite).toHaveBeenCalledWith({
			file: 'present.php',
			contents: presentContents,
		});
	});
});
