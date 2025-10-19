import path from 'node:path';
import { KernelError } from '@wpkernel/core/error';
import type { Reporter } from '@wpkernel/core/reporter';
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

const output: BuilderOutput = {
	actions: [],
	queueWrite: jest.fn(),
};

describe('createPhpBuilder (unit)', () => {
	it('throws when invoked without an IR during the generate phase', async () => {
		const builder = createPhpBuilder();
		const reporter = createReporter();
		const workspace = createWorkspace();

		await expect(
			builder.apply(
				{
					context: {
						workspace,
						reporter,
						phase: 'generate',
					},
					input: {
						phase: 'generate',
						options: {
							config: {} as never,
							namespace: 'demo',
							origin: 'kernel.config.ts',
							sourcePath: 'kernel.config.ts',
						},
						ir: null,
					},
					output,
					reporter,
				},
				undefined
			)
		).rejects.toThrow(KernelError);
	});
});
