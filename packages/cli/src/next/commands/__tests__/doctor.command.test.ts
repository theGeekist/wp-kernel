import path from 'node:path';
import { WPK_EXIT_CODES } from '@wpkernel/core/contracts';
import { assignCommandContext } from '@wpkernel/test-utils/cli';
import { buildDoctorCommand } from '../doctor';

describe('buildDoctorCommand', () => {
	const reporterFactory = jest.fn(createReporterMock);
	const loadKernelConfig = jest.fn();
	const buildWorkspace = jest.fn();
	const ensureGeneratedPhpClean = jest.fn();
	const checkPhpEnvironment = jest.fn();

	beforeEach(() => {
		reporterFactory.mockImplementation(createReporterMock);
		ensureGeneratedPhpClean.mockResolvedValue(undefined);
		checkPhpEnvironment.mockResolvedValue([
			buildCheck('php-driver', 'PHP driver', 'pass', 'Driver ok'),
			buildCheck('php-runtime', 'PHP runtime', 'pass', 'Runtime ok'),
		]);
		const configPath = path.join(process.cwd(), 'kernel.config.ts');
		loadKernelConfig.mockResolvedValue({
			config: {},
			sourcePath: configPath,
			configOrigin: 'kernel.config.ts',
			composerCheck: 'ok',
			namespace: 'Demo\\\\Plugin\\\\',
		});
		buildWorkspace.mockReturnValue({ root: process.cwd() });
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('returns success when all checks pass', async () => {
		const DoctorCommand = buildDoctorCommand({
			loadKernelConfig,
			buildWorkspace,
			ensureGeneratedPhpClean,
			buildReporter: reporterFactory,
			checkPhpEnvironment,
		});

		const command = new DoctorCommand();
		const { stdout } = assignCommandContext(command);

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.SUCCESS);
		expect(stdout.toString()).toContain('[PASS] Kernel config');
		expect(stdout.toString()).toContain('[PASS] Composer autoload');
		expect(stdout.toString()).toContain('[PASS] PHP driver');
		expect(ensureGeneratedPhpClean).toHaveBeenCalledTimes(1);
		expect(checkPhpEnvironment).toHaveBeenCalledTimes(1);
	});

	it('returns failure when kernel config fails to load', async () => {
		loadKernelConfig.mockRejectedValueOnce(new Error('missing config'));

		const DoctorCommand = buildDoctorCommand({
			loadKernelConfig,
			buildWorkspace,
			ensureGeneratedPhpClean,
			buildReporter: reporterFactory,
			checkPhpEnvironment,
		});

		const command = new DoctorCommand();
		const { stdout } = assignCommandContext(command);

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.UNEXPECTED_ERROR);
		expect(stdout.toString()).toContain('[FAIL] Kernel config');
		expect(buildWorkspace).not.toHaveBeenCalled();
		expect(ensureGeneratedPhpClean).not.toHaveBeenCalled();
		expect(checkPhpEnvironment).toHaveBeenCalledTimes(1);
	});

	it('returns failure when PHP environment check fails', async () => {
		checkPhpEnvironment.mockResolvedValue([
			buildCheck('php-driver', 'PHP driver', 'fail', 'Missing driver'),
		]);

		const DoctorCommand = buildDoctorCommand({
			loadKernelConfig,
			buildWorkspace,
			ensureGeneratedPhpClean,
			buildReporter: reporterFactory,
			checkPhpEnvironment,
		});

		const command = new DoctorCommand();
		assignCommandContext(command);

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.UNEXPECTED_ERROR);
		expect(checkPhpEnvironment).toHaveBeenCalledTimes(1);
	});

	it('continues execution when workspace hygiene check warns', async () => {
		ensureGeneratedPhpClean.mockRejectedValueOnce(
			new Error('dirty workspace')
		);

		const DoctorCommand = buildDoctorCommand({
			loadKernelConfig,
			buildWorkspace,
			ensureGeneratedPhpClean,
			buildReporter: reporterFactory,
			checkPhpEnvironment,
		});

		const command = new DoctorCommand();
		const { stdout } = assignCommandContext(command);

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.SUCCESS);
		expect(stdout.toString()).toContain('[WARN] Workspace hygiene');
	});

	it('warns when composer autoload mapping is missing', async () => {
		const configPath = path.join(process.cwd(), 'kernel.config.ts');
		loadKernelConfig.mockResolvedValueOnce({
			config: {},
			sourcePath: configPath,
			configOrigin: 'kernel.config.ts',
			composerCheck: 'mismatch',
			namespace: 'Demo\\\\Plugin\\\\',
		});

		const DoctorCommand = buildDoctorCommand({
			loadKernelConfig,
			buildWorkspace,
			ensureGeneratedPhpClean,
			buildReporter: reporterFactory,
			checkPhpEnvironment,
		});

		const command = new DoctorCommand();
		const { stdout } = assignCommandContext(command);

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.SUCCESS);
		expect(stdout.toString()).toContain('[WARN] Composer autoload');
	});

	it('warns when workspace cannot be resolved', async () => {
		buildWorkspace.mockReturnValueOnce(null as unknown as { root: string });

		const DoctorCommand = buildDoctorCommand({
			loadKernelConfig,
			buildWorkspace,
			ensureGeneratedPhpClean,
			buildReporter: reporterFactory,
			checkPhpEnvironment,
		});

		const command = new DoctorCommand();
		const { stdout } = assignCommandContext(command);

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.SUCCESS);
		expect(stdout.toString()).toContain('[WARN] Workspace hygiene');
		expect(ensureGeneratedPhpClean).not.toHaveBeenCalled();
	});

	it('prints unknown status labels for unexpected checks', async () => {
		checkPhpEnvironment.mockResolvedValue([
			buildCheck('php-driver', 'PHP driver', 'pass', 'Driver ok'),
			{
				key: 'mystery',
				label: 'Mystery check',
				status: 'mystery',
				message: '???',
			} as unknown as ReturnType<typeof buildCheck>,
		]);

		const DoctorCommand = buildDoctorCommand({
			loadKernelConfig,
			buildWorkspace,
			ensureGeneratedPhpClean,
			buildReporter: reporterFactory,
			checkPhpEnvironment,
		});

		const command = new DoctorCommand();
		const { stdout } = assignCommandContext(command);

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.SUCCESS);
		expect(stdout.toString()).toContain('[UNKNOWN] Mystery check');
	});
});

describe('renderDoctorSummary', () => {
	it('returns fallback when no checks executed', () => {
		const { renderDoctorSummary } = jest.requireActual('../doctor') as {
			renderDoctorSummary: (
				results: ReadonlyArray<{
					readonly key: string;
					readonly label: string;
					readonly status: string;
					readonly message: string;
				}>
			) => string;
		};

		expect(renderDoctorSummary([])).toBe(
			'Health checks:\n- No checks executed.\n'
		);
	});
});

function buildCheck(
	key: string,
	label: string,
	status: 'pass' | 'warn' | 'fail',
	message: string
) {
	return { key, label, status, message };
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
