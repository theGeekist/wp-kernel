import path from 'node:path';
import { assignCommandContext } from '@wpkernel/test-utils/cli';
import { WPK_EXIT_CODES } from '@wpkernel/core/contracts';

const execFileMock = jest.fn();

describe('doctor command default environment checks', () => {
	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
		execFileMock.mockImplementation((...args: unknown[]) => {
			const callback = args[args.length - 1] as (
				error: Error | null,
				stdout?: string
			) => void;
			callback(null, 'PHP 8.1.0');
		});
	});

	it('passes when PHP driver and runtime are available', async () => {
		mockPhpDriverSuccess();
		mockChildProcess();

		const { buildDoctorCommand } = await import('../doctor');

		const loadWPKernelConfig = jest.fn().mockResolvedValue({
			config: {},
			sourcePath: path.join(process.cwd(), 'wpk.config.ts'),
			configOrigin: 'wpk.config.ts',
			composerCheck: 'ok',
			namespace: 'Demo\\\\Plugin\\\\',
		});
		const buildWorkspace = jest
			.fn()
			.mockReturnValue({ root: process.cwd() });
		const ensureGeneratedPhpClean = jest.fn().mockResolvedValue(undefined);
		const reporterFactory = jest.fn(() => createReporterMock());

		const DoctorCommand = buildDoctorCommand({
			loadWPKernelConfig,
			buildWorkspace,
			ensureGeneratedPhpClean,
			buildReporter: reporterFactory,
		});

		const command = new DoctorCommand();
		const { stdout } = assignCommandContext(command);

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.SUCCESS);
		expect(stdout.toString()).toContain('[PASS] PHP driver');
		expect(stdout.toString()).toContain('[PASS] PHP runtime');
		expect(execFileMock).toHaveBeenCalled();
	});

	it('warns when the PHP runtime is missing', async () => {
		mockPhpDriverSuccess();
		mockChildProcess();
		execFileMock.mockImplementationOnce((...args: unknown[]) => {
			const callback = args[args.length - 1] as (
				error: Error | null
			) => void;
			callback(new Error('not found'));
		});

		const { buildDoctorCommand } = await import('../doctor');

		const loadWPKernelConfig = jest.fn().mockResolvedValue({
			config: {},
			sourcePath: path.join(process.cwd(), 'wpk.config.ts'),
			configOrigin: 'wpk.config.ts',
			composerCheck: 'ok',
			namespace: 'Demo\\\\Plugin\\\\',
		});
		const buildWorkspace = jest
			.fn()
			.mockReturnValue({ root: process.cwd() });
		const ensureGeneratedPhpClean = jest.fn().mockResolvedValue(undefined);
		const reporterFactory = jest.fn(() => createReporterMock());

		const DoctorCommand = buildDoctorCommand({
			loadWPKernelConfig,
			buildWorkspace,
			ensureGeneratedPhpClean,
			buildReporter: reporterFactory,
		});

		const command = new DoctorCommand();
		const { stdout } = assignCommandContext(command);

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.SUCCESS);
		expect(stdout.toString()).toContain('[WARN] PHP runtime');
	});

	it('fails when the PHP driver cannot be resolved', async () => {
		mockPhpDriverFailure();
		mockChildProcess();

		const { buildDoctorCommand } = await import('../doctor');

		const loadWPKernelConfig = jest.fn().mockResolvedValue({
			config: {},
			sourcePath: path.join(process.cwd(), 'wpk.config.ts'),
			configOrigin: 'wpk.config.ts',
			composerCheck: 'ok',
			namespace: 'Demo\\\\Plugin\\\\',
		});
		const buildWorkspace = jest
			.fn()
			.mockReturnValue({ root: process.cwd() });
		const ensureGeneratedPhpClean = jest.fn().mockResolvedValue(undefined);
		const reporterFactory = jest.fn(() => createReporterMock());

		const DoctorCommand = buildDoctorCommand({
			loadWPKernelConfig,
			buildWorkspace,
			ensureGeneratedPhpClean,
			buildReporter: reporterFactory,
		});

		const command = new DoctorCommand();
		const { stdout } = assignCommandContext(command);

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.UNEXPECTED_ERROR);
		expect(stdout.toString()).toContain('[FAIL] PHP driver');
	});
});

function mockPhpDriverSuccess() {
	jest.doMock('@wpkernel/php-driver', () => ({}), { virtual: true });
}

function mockPhpDriverFailure() {
	jest.doMock(
		'@wpkernel/php-driver',
		() => {
			throw new Error('module not found');
		},
		{ virtual: true }
	);
}

function mockChildProcess() {
	jest.doMock('node:child_process', () => ({
		execFile: (...args: unknown[]) => execFileMock(...args),
	}));
}

function createReporterMock() {
	return {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
		child: jest.fn(() => createReporterMock()),
	};
}
