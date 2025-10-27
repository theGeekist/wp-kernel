import path from 'node:path';
import { assignCommandContext } from '@wpkernel/test-utils/cli';
import type { Reporter } from '@wpkernel/core/reporter';
import { WPK_EXIT_CODES } from '@wpkernel/core/contracts';
import { buildDoctorCommand, type BuildDoctorCommandOptions } from '../doctor';
import type { Workspace } from '../../workspace';

describe('buildDoctorCommand', () => {
	it('returns a distinct command class per invocation', () => {
		const FirstDoctor = buildDoctorCommand();
		const SecondDoctor = buildDoctorCommand();

		expect(FirstDoctor).not.toBe(SecondDoctor);
	});

	it('wires dependency overrides into the command execution', async () => {
		const reporter = createReporterMock();
		const loadKernelConfig = jest.fn().mockResolvedValue({
			config: {},
			namespace: 'Demo',
			sourcePath: path.join(process.cwd(), 'kernel.config.ts'),
			configOrigin: 'kernel.config.ts',
		});
		const workspace = createWorkspaceStub();
		const buildWorkspace = jest.fn().mockReturnValue(workspace);
		const ensureGeneratedPhpClean = jest.fn().mockResolvedValue(undefined);
		const checkPhpBinary = jest.fn().mockResolvedValue(undefined);
		const buildReporter = jest.fn().mockReturnValue(reporter);

		const DoctorCommand = buildDoctorCommand({
			loadKernelConfig,
			buildWorkspace,
			ensureGeneratedPhpClean,
			checkPhpBinary,
			buildReporter,
		} satisfies BuildDoctorCommandOptions);

		const command = new DoctorCommand();
		assignCommandContext(command, { cwd: workspace.root });

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.SUCCESS);
		expect(loadKernelConfig).toHaveBeenCalledTimes(1);
		expect(buildWorkspace).toHaveBeenCalledWith(process.cwd());
		expect(ensureGeneratedPhpClean).toHaveBeenCalledTimes(1);
		expect(checkPhpBinary).toHaveBeenCalledTimes(1);
		expect(buildReporter).toHaveBeenCalledTimes(1);
	});
});

function createReporterMock(): jest.Mocked<Reporter> {
	const reporter: jest.Mocked<Reporter> = {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
		child: jest.fn(),
	};
	reporter.child.mockReturnValue(reporter);
	return reporter;
}

function createWorkspaceStub(): Workspace {
	const root = process.cwd();
	return {
		root,
		resolve: (...parts: string[]) => path.resolve(root, ...parts),
		exists: jest.fn(async () => false),
		cwd: jest.fn(() => root),
		read: jest.fn(async () => null),
		readText: jest.fn(async () => null),
		write: jest.fn(async () => undefined),
		writeJson: jest.fn(async () => undefined),
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
		tmpDir: jest.fn(async () => path.join(root, '.tmp')),
	} satisfies Workspace;
}
