import path from 'node:path';
import {
	assignCommandContext,
	createCommandWorkspaceHarness,
	createReporterFactory,
} from '@wpkernel/test-utils/cli';
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

	it('passes when PHP printer path and runtime are available', async () => {
		const { buildDoctorCommand } = await import('../doctor');

		const loadWPKernelConfig = jest.fn().mockResolvedValue({
			config: {},
			sourcePath: path.join(process.cwd(), 'wpk.config.ts'),
			configOrigin: 'wpk.config.ts',
			composerCheck: 'ok',
			namespace: 'Demo\\Plugin\\',
		});
		const { workspace } = createCommandWorkspaceHarness({
			root: process.cwd(),
			files: {
				'composer.json': '{}',
				'vendor/autoload.php': '',
			},
		});
		const buildWorkspace = jest.fn().mockReturnValue(workspace);
		const reporterFactory = createReporterFactory();

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
				phpPrinterPath: {
					access: async () => undefined,
					realpath: async () =>
						path.join(process.cwd(), 'packages', 'cli'),
				},
			}),
		});

		const command = new DoctorCommand();
		const { stdout } = assignCommandContext(command);

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.SUCCESS);
		expect(stdout.toString()).toContain('[PASS] PHP printer path');
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
		const { workspace } = createCommandWorkspaceHarness({
			root: process.cwd(),
			files: {
				'composer.json': '{}',
				'vendor/autoload.php': '',
			},
		});
		const buildWorkspace = jest.fn().mockReturnValue(workspace);
		const reporterFactory = createReporterFactory();

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
				phpPrinterPath: {
					access: async () => undefined,
					realpath: async () =>
						path.join(process.cwd(), 'packages', 'cli'),
				},
			}),
		});

		const command = new DoctorCommand();
		const { stdout } = assignCommandContext(command);

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.SUCCESS);
		expect(stdout.toString()).toContain('[WARN] PHP runtime');
	});

	it('fails when the PHP printer path cannot be resolved', async () => {
		const { buildDoctorCommand } = await import('../doctor');

		const loadWPKernelConfig = jest.fn().mockResolvedValue({
			config: {},
			sourcePath: path.join(process.cwd(), 'wpk.config.ts'),
			configOrigin: 'wpk.config.ts',
			composerCheck: 'ok',
			namespace: 'Demo\\Plugin\\',
		});
		const { workspace } = createCommandWorkspaceHarness({
			root: process.cwd(),
			files: {
				'composer.json': '{}',
				'vendor/autoload.php': '',
			},
		});
		const buildWorkspace = jest.fn().mockReturnValue(workspace);
		const reporterFactory = createReporterFactory();

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
				phpPrinterPath: {
					access: async () => undefined,
					realpath: async () => {
						throw new Error('missing asset');
					},
				},
			}),
		});

		const command = new DoctorCommand();
		const { stdout } = assignCommandContext(command);

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.UNEXPECTED_ERROR);
		expect(stdout.toString()).toContain('[FAIL] PHP printer path');
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
		const { workspace } = createCommandWorkspaceHarness({
			root: process.cwd(),
			files: {
				'composer.json': '{}',
			},
		});
		const buildWorkspace = jest.fn().mockReturnValue(workspace);
		const reporterFactory = createReporterFactory();

		const DoctorCommand = buildDoctorCommand({
			loadWPKernelConfig,
			buildWorkspace,
			buildReporter: reporterFactory,
			buildReadinessRegistry: createReadinessBuilder(),
		});

		const command = new DoctorCommand();
		const { stdout } = assignCommandContext(command);

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.SUCCESS);
		expect(stdout.toString()).toContain('[WARN] Bundled PHP autoload');
	});
});

function createReadinessBuilder(
	overrides: DefaultReadinessHelperOverrides = {}
) {
	const helperOverrides: DefaultReadinessHelperOverrides = {
		workspaceHygiene: {
			ensureClean: jest.fn().mockResolvedValue(undefined),
			...(overrides.workspaceHygiene ?? {}),
		},
		composer: {
			pathExists: jest.fn().mockResolvedValue(false),
			...(overrides.composer ?? {}),
		},
		phpRuntime: overrides.phpRuntime,
		phpPrinterPath: overrides.phpPrinterPath,
		phpCodemodIngestion: overrides.phpCodemodIngestion,
		git: overrides.git,
		tsxRuntime: overrides.tsxRuntime,
		releasePack: {
			manifest: overrides.releasePack?.manifest ?? [],
			dependencies: {
				access: jest.fn().mockResolvedValue(undefined),
				exec: jest
					.fn<
						(
							command: string,
							args: readonly string[],
							options?: unknown
						) => Promise<{ stdout: string; stderr: string }>
					>()
					.mockResolvedValue({ stdout: '', stderr: '' }),
				readFile: jest.fn().mockResolvedValue(''),
				...(overrides.releasePack?.dependencies ?? {}),
			},
		},
		bootstrapperResolution: {
			dependencies: {
				access: jest.fn().mockResolvedValue(undefined),
				mkdtemp: jest
					.fn<(...args: string[]) => Promise<string>>()
					.mockResolvedValue(
						path.join(process.cwd(), 'wpk-bootstrapper-test')
					),
				rm: jest.fn().mockResolvedValue(undefined),
				exec: jest
					.fn<
						(
							command: string,
							args: readonly string[],
							options?: unknown
						) => Promise<{ stdout: string; stderr: string }>
					>()
					.mockResolvedValue({ stdout: '', stderr: '' }),
				...(overrides.bootstrapperResolution?.dependencies ?? {}),
			},
		},
		quickstart: {
			dependencies: {
				mkdtemp: jest
					.fn<(...args: string[]) => Promise<string>>()
					.mockResolvedValue(
						path.join(process.cwd(), 'wpk-quickstart-test')
					),
				rm: jest.fn().mockResolvedValue(undefined),
				access: jest.fn().mockResolvedValue(undefined),
				exec: jest
					.fn<
						(
							command: string,
							args: readonly string[],
							options?: unknown
						) => Promise<{ stdout: string; stderr: string }>
					>()
					.mockResolvedValue({ stdout: '', stderr: '' }),
				resolve: jest
					.fn<(id: string) => string>()
					.mockReturnValue(
						path.join(
							process.cwd(),
							'node_modules',
							'tsx',
							'dist',
							'index.js'
						)
					),
				...(overrides.quickstart?.dependencies ?? {}),
			},
		},
	};

	return () =>
		buildDefaultReadinessRegistry({
			helperOverrides,
		});
}
