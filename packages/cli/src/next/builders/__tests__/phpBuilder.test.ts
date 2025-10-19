import path from 'node:path';
import type { Reporter } from '@wpkernel/core/reporter';
import type { IRv1 } from '../../../ir/types';
import { createPhpBuilder } from '../php';
import type { BuilderOutput } from '../../runtime/types';
import type { Workspace } from '../../workspace/types';

function createReporter(): Reporter {
	return {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		child: jest.fn().mockReturnThis(),
	};
}

function createWorkspace(): Workspace {
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
		tmpDir: jest.fn(async () => '.tmp'),
		resolve: jest.fn((...parts: string[]) =>
			path.join(process.cwd(), ...parts)
		),
	} as unknown as Workspace;
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

describe('createPhpBuilder', () => {
	const builder = createPhpBuilder();

	const baseOutput: BuilderOutput = {
		actions: [],
		queueWrite: jest.fn(),
	};

	it('logs a debug message and skips non-generate phases', async () => {
		const reporter = createReporter();
		const workspace = createWorkspace();

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
				output: baseOutput,
				reporter,
			},
			undefined
		);

		expect(reporter.debug).toHaveBeenCalledWith(
			'createPhpBuilder: skipping phase.',
			{ phase: 'init' }
		);
		expect(reporter.warn).not.toHaveBeenCalled();
	});

	it('warns and defers execution when generation is placeholder-only', async () => {
		const reporter = createReporter();
		const workspace = createWorkspace();
		const next = jest.fn();

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
				output: baseOutput,
				reporter,
			},
			next
		);

		expect(reporter.warn).toHaveBeenCalledWith(
			'createPhpBuilder: next-gen PHP pipeline placeholder active; skipping artifact generation.'
		);
		expect(next).toHaveBeenCalled();
	});
});
