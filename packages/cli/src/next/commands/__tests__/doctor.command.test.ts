import path from 'node:path';
import fs from 'node:fs/promises';
import { assignCommandContext } from '@wpkernel/test-utils/cli';
import type { Reporter } from '@wpkernel/core/reporter';
import { WPK_EXIT_CODES } from '@wpkernel/core/contracts';
import { buildDoctorCommand, type BuildDoctorCommandOptions } from '../doctor';

jest.mock('node:fs/promises', () => ({
	access: jest.fn(),
}));

const mockedFs = fs as jest.Mocked<typeof fs>;

describe('NextDoctorCommand', () => {
	beforeEach(() => {
		jest.resetModules();
		mockedFs.access.mockResolvedValue(undefined);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('runs all checks and reports success', async () => {
		const reporter = createReporterMock();
		const loadKernelConfig = jest.fn().mockResolvedValue({
			config: {},
			namespace: 'Demo',
			sourcePath: path.join(process.cwd(), 'kernel.config.ts'),
			configOrigin: 'kernel.config.ts',
		});
		const ensureGeneratedPhpClean = jest.fn().mockResolvedValue(undefined);
		const checkPhpBinary = jest.fn().mockResolvedValue(undefined);
		const DoctorCommand = buildDoctorCommand({
			loadKernelConfig,
			buildWorkspace: jest.fn().mockReturnValue({ root: process.cwd() }),
			ensureGeneratedPhpClean,
			checkPhpBinary,
			buildReporter: jest.fn().mockReturnValue(reporter),
		} satisfies BuildDoctorCommandOptions);

		const command = new DoctorCommand();
		const { stdout } = assignCommandContext(command);

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.SUCCESS);
		expect(
			command.results.map(({ key, status }) => ({ key, status }))
		).toEqual([
			{ key: 'kernel-config', status: 'pass' },
			{ key: 'composer', status: 'pass' },
			{ key: 'php-binary', status: 'pass' },
			{ key: 'workspace-hygiene', status: 'pass' },
		]);
		expect(stdout.toString()).toContain('Doctor summary:');
	});

	it('returns validation error when config fails to load', async () => {
		const reporter = createReporterMock();
		const loadKernelConfig = jest
			.fn()
			.mockRejectedValue(new Error('missing'));
		const DoctorCommand = buildDoctorCommand({
			loadKernelConfig,
			buildReporter: jest.fn().mockReturnValue(reporter),
		});

		const command = new DoctorCommand();
		assignCommandContext(command);

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.VALIDATION_ERROR);
		expect(command.results[0]).toMatchObject({
			key: 'kernel-config',
			status: 'fail',
		});
		expect(reporter.error).toHaveBeenCalled();
	});

	it('warns when composer autoload is missing', async () => {
		mockedFs.access
			.mockResolvedValueOnce(undefined) // composer.json
			.mockRejectedValueOnce(new Error('missing autoload'));

		const DoctorCommand = buildDoctorCommand({
			loadKernelConfig: jest.fn().mockResolvedValue({
				config: {},
				namespace: 'Demo',
				sourcePath: path.join(process.cwd(), 'kernel.config.ts'),
				configOrigin: 'kernel.config.ts',
			}),
			buildWorkspace: jest.fn().mockReturnValue({ root: process.cwd() }),
			ensureGeneratedPhpClean: jest.fn().mockResolvedValue(undefined),
			checkPhpBinary: jest.fn().mockResolvedValue(undefined),
			buildReporter: jest.fn().mockReturnValue(createReporterMock()),
		});

		const command = new DoctorCommand();
		assignCommandContext(command);

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.SUCCESS);
		expect(command.results).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ key: 'composer', status: 'warn' }),
			])
		);
	});

	it('fails when PHP binary check rejects', async () => {
		const DoctorCommand = buildDoctorCommand({
			loadKernelConfig: jest.fn().mockResolvedValue({
				config: {},
				namespace: 'Demo',
				sourcePath: path.join(process.cwd(), 'kernel.config.ts'),
				configOrigin: 'kernel.config.ts',
			}),
			buildWorkspace: jest.fn().mockReturnValue({ root: process.cwd() }),
			ensureGeneratedPhpClean: jest.fn().mockResolvedValue(undefined),
			checkPhpBinary: jest
				.fn()
				.mockRejectedValue(new Error('php not found')),
			buildReporter: jest.fn().mockReturnValue(createReporterMock()),
		});

		const command = new DoctorCommand();
		assignCommandContext(command);

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.VALIDATION_ERROR);
		expect(command.results).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ key: 'php-binary', status: 'fail' }),
			])
		);
	});

	it('fails when workspace hygiene check throws', async () => {
		const DoctorCommand = buildDoctorCommand({
			loadKernelConfig: jest.fn().mockResolvedValue({
				config: {},
				namespace: 'Demo',
				sourcePath: path.join(process.cwd(), 'kernel.config.ts'),
				configOrigin: 'kernel.config.ts',
			}),
			buildWorkspace: jest.fn().mockReturnValue({ root: process.cwd() }),
			ensureGeneratedPhpClean: jest
				.fn()
				.mockRejectedValue(new Error('dirty')),
			checkPhpBinary: jest.fn().mockResolvedValue(undefined),
			buildReporter: jest.fn().mockReturnValue(createReporterMock()),
		});

		const command = new DoctorCommand();
		assignCommandContext(command);

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.VALIDATION_ERROR);
		expect(command.results).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					key: 'workspace-hygiene',
					status: 'fail',
				}),
			])
		);
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
