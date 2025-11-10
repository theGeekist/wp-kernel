import path from 'node:path';
import { assignCommandContext } from '@wpkernel/test-utils/cli';
import { WPK_EXIT_CODES } from '@wpkernel/core/contracts';
import {
	buildDefaultReadinessRegistry,
	type DefaultReadinessHelperOverrides,
} from '../../dx';

describe('doctor command default environment checks', () => {
	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
	});

	it('passes when PHP driver and runtime are available', async () => {
		const { buildDoctorCommand } = await import('../doctor');

		const loadWPKernelConfig = jest.fn().mockResolvedValue({
			config: {},
			sourcePath: path.join(process.cwd(), 'wpk.config.ts'),
			configOrigin: 'wpk.config.ts',
			composerCheck: 'ok',
			namespace: 'Demo\\Plugin\\',
		});
		const workspace = createWorkspaceMock();
		const buildWorkspace = jest.fn().mockReturnValue(workspace);
		const reporterFactory = jest.fn(() => createReporterMock());

		const DoctorCommand = buildDoctorCommand({
			loadWPKernelConfig,
			buildWorkspace,
			buildReporter: reporterFactory,
			buildReadinessRegistry: createReadinessBuilder({
				phpRuntime: {
					exec: async () => ({
						stdout: 'PHP 8.1.0',
						stderr: '',
					}),
				},
				phpDriver: {
					resolve: () =>
						path.join(
							process.cwd(),
							'node_modules',
							'@wpkernel',
							'php-driver',
							'package.json'
						),
					access: async () => undefined,
				},
			}),
		});

		const command = new DoctorCommand();
		const { stdout } = assignCommandContext(command);

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.SUCCESS);
		expect(stdout.toString()).toContain('[PASS] PHP driver');
		expect(stdout.toString()).toContain('[PASS] PHP runtime');
	});

	it('warns when the PHP runtime is missing', async () => {
		const { buildDoctorCommand } = await import('../doctor');

		const loadWPKernelConfig = jest.fn().mockResolvedValue({
			config: {},
			sourcePath: path.join(process.cwd(), 'wpk.config.ts'),
			configOrigin: 'wpk.config.ts',
			composerCheck: 'ok',
			namespace: 'Demo\\Plugin\\',
		});
		const workspace = createWorkspaceMock();
		const buildWorkspace = jest.fn().mockReturnValue(workspace);
		const reporterFactory = jest.fn(() => createReporterMock());

		const DoctorCommand = buildDoctorCommand({
			loadWPKernelConfig,
			buildWorkspace,
			buildReporter: reporterFactory,
			buildReadinessRegistry: createReadinessBuilder({
				phpRuntime: {
					exec: async () => {
						throw new Error('not found');
					},
				},
				phpDriver: {
					resolve: () =>
						path.join(
							process.cwd(),
							'node_modules',
							'@wpkernel',
							'php-driver',
							'package.json'
						),
					access: async () => undefined,
				},
			}),
		});

		const command = new DoctorCommand();
		const { stdout } = assignCommandContext(command);

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.SUCCESS);
		expect(stdout.toString()).toContain('[WARN] PHP runtime');
	});

	it('fails when the PHP driver cannot be resolved', async () => {
		const { buildDoctorCommand } = await import('../doctor');

		const loadWPKernelConfig = jest.fn().mockResolvedValue({
			config: {},
			sourcePath: path.join(process.cwd(), 'wpk.config.ts'),
			configOrigin: 'wpk.config.ts',
			composerCheck: 'ok',
			namespace: 'Demo\\Plugin\\',
		});
		const workspace = createWorkspaceMock();
		const buildWorkspace = jest.fn().mockReturnValue(workspace);
		const reporterFactory = jest.fn(() => createReporterMock());

		const DoctorCommand = buildDoctorCommand({
			loadWPKernelConfig,
			buildWorkspace,
			buildReporter: reporterFactory,
			buildReadinessRegistry: createReadinessBuilder({
				phpRuntime: {
					exec: async () => ({
						stdout: 'PHP 8.1.0',
						stderr: '',
					}),
				},
				phpDriver: {
					resolve: () => {
						throw new Error('module not found');
					},
					access: async () => {
						throw new Error('missing asset');
					},
				},
			}),
		});

		const command = new DoctorCommand();
		const { stdout } = assignCommandContext(command);

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.UNEXPECTED_ERROR);
		expect(stdout.toString()).toContain('[FAIL] PHP driver');
	});

	it('warns about composer autoload without installing dependencies', async () => {
		const { buildDoctorCommand } = await import('../doctor');

		const loadWPKernelConfig = jest.fn().mockResolvedValue({
			config: {},
			sourcePath: path.join(process.cwd(), 'wpk.config.ts'),
			configOrigin: 'wpk.config.ts',
			composerCheck: 'ok',
			namespace: 'Demo\\Plugin\\',
		});
		const workspace = {
			...createWorkspaceMock(),
			exists: jest.fn(async (target: string) => {
				if (target === 'composer.json') {
					return true;
				}
				if (target === path.join('vendor', 'autoload.php')) {
					return false;
				}
				return false;
			}),
		};
		const buildWorkspace = jest.fn().mockReturnValue(workspace);
		const reporterFactory = jest.fn(() => createReporterMock());
		const install = jest.fn();

		const DoctorCommand = buildDoctorCommand({
			loadWPKernelConfig,
			buildWorkspace,
			buildReporter: reporterFactory,
			buildReadinessRegistry: createReadinessBuilder({
				composer: {
					install,
				},
			}),
		});

		const command = new DoctorCommand();
		const { stdout } = assignCommandContext(command);

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.SUCCESS);
		expect(stdout.toString()).toContain('[WARN] Composer dependencies');
		expect(install).not.toHaveBeenCalled();
	});
});

function createReporterMock() {
	return {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
		child: jest.fn(() => createReporterMock()),
	};
}

function createWorkspaceMock() {
	const vendorAutoload = path.join('vendor', 'autoload.php');
	return {
		root: process.cwd(),
		exists: jest.fn(async (target: string) => {
			if (target === 'composer.json') {
				return true;
			}
			if (target === vendorAutoload) {
				return true;
			}
			return false;
		}),
		rm: jest.fn().mockResolvedValue(undefined),
	};
}

function createReadinessBuilder(
	overrides: DefaultReadinessHelperOverrides = {}
) {
	const helperOverrides: DefaultReadinessHelperOverrides = {
		workspaceHygiene: {
			ensureClean: jest.fn().mockResolvedValue(undefined),
			...(overrides.workspaceHygiene ?? {}),
		},
		composer: {
			install: jest.fn().mockResolvedValue(undefined),
			installOnPending: false,
			...(overrides.composer ?? {}),
		},
		phpRuntime: overrides.phpRuntime,
		phpDriver: overrides.phpDriver,
		git: overrides.git,
		tsxRuntime: overrides.tsxRuntime,
	};

	return () =>
		buildDefaultReadinessRegistry({
			helperOverrides,
		});
}
