import path from 'node:path';
import { EventEmitter } from 'node:events';
import type { ChildProcess, PromiseWithChild } from 'node:child_process';
import {
	assignCommandContext,
	createCommandWorkspaceHarness,
} from '@cli-tests/cli';
import { createReporterFactory } from '@cli-tests/reporter';
import { WPK_EXIT_CODES } from '@wpkernel/core/contracts';
import {
	buildDefaultReadinessRegistry,
	type BuildDefaultReadinessRegistryOptions,
	type DefaultReadinessHelperOverrides,
	type ReleasePackDependencies,
	type BootstrapperResolutionDependencies,
	type QuickstartHelperOptions,
	type ReleasePackHelperOptions,
	type BootstrapperResolutionHelperOptions,
	type PhpRuntimeDependencies,
	type PhpPrinterPathDependencies,
} from '../../dx';
import { resetPhpAssetsMock } from '@cli-tests/mocks';
import type { MockFs } from '@cli-tests/mocks';
import { createQuickstartDepsMock } from '@cli-tests/dx/quickstart.test-support';

jest.mock('node:fs/promises', () => {
	const { createMockFs } = jest.requireActual('@cli-tests/mocks');
	return createMockFs();
});
const mockFs = jest.requireMock('node:fs/promises') as MockFs;
jest.mock('../../utils/phpAssets', () => {
	const { phpAssetsMock } = jest.requireActual('@cli-tests/mocks/php-assets');
	return phpAssetsMock;
});

describe('doctor command default environment checks', () => {
	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
		resetPhpAssetsMock();

		// Clear mockFs state for each test
		mockFs.files.clear();
		mockFs.readFile.mockClear();
		mockFs.readFileSync.mockClear();
		mockFs.writeFile.mockClear();
		mockFs.access.mockClear();
		mockFs.exists.mockClear();
		mockFs.existsSync.mockClear();
		mockFs.stat.mockClear();
		mockFs.rm.mockClear();
	});

	it('passes when PHP printer path and runtime are available', async () => {
		const { buildDoctorCommand } = await import('../doctor');

		const loadWPKernelConfig = jest.fn().mockResolvedValue({
			config: {},
			sourcePath: path.join(process.cwd(), 'wpk.config.ts'),
			configOrigin: 'wpk.config.ts',
			namespace: 'Demo\\Plugin\\',
		});
		const phpRuntimeExec = createExecMock<PhpRuntimeDependencies['exec']>({
			stdout: 'PHP 8.1.0',
			stderr: '',
		});
		const printerAccessReady = createPromiseMock<
			PhpPrinterPathDependencies['access']
		>((..._args) => undefined);
		const printerRealpathReady = createPromiseMock<
			PhpPrinterPathDependencies['realpath']
		>((..._args) => path.join(process.cwd(), 'packages', 'cli'));
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
				composer: {
					pathExists: jest.fn().mockResolvedValue(true),
				},
				phpRuntime: {
					exec: phpRuntimeExec,
				},
				phpPrinterPath: {
					access: printerAccessReady,
					realpath: printerRealpathReady,
				},
			}),
		});

		const command = new DoctorCommand();
		const { stdout } = assignCommandContext(command);

		const exitCode = await command.execute();
		expect(exitCode).toBe(WPK_EXIT_CODES.SUCCESS);
		expect(printerAccessReady).toHaveBeenCalled();
		expect(stdout.toString()).toContain('[PASS] PHP printer path');
		expect(stdout.toString()).toContain('[PASS] PHP runtime');
	});

	it('warns when the PHP runtime is missing', async () => {
		const { buildDoctorCommand } = await import('../doctor');

		const loadWPKernelConfig = jest.fn().mockResolvedValue({
			config: {},
			sourcePath: path.join(process.cwd(), 'wpk.config.ts'),
			configOrigin: 'wpk.config.ts',
			namespace: 'Demo\\Plugin\\',
		});
		const phpRuntimeExec = createRejectingExecMock<
			PhpRuntimeDependencies['exec']
		>(new Error('not found'));
		const printerAccessRuntime = createPromiseMock<
			PhpPrinterPathDependencies['access']
		>((..._args) => undefined);
		const printerRealpathRuntime = createPromiseMock<
			PhpPrinterPathDependencies['realpath']
		>((..._args) => path.join(process.cwd(), 'packages', 'cli'));
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
				composer: {
					pathExists: jest.fn().mockResolvedValue(true),
				},
				phpRuntime: {
					exec: phpRuntimeExec,
				},
				phpPrinterPath: {
					access: printerAccessRuntime,
					realpath: printerRealpathRuntime,
				},
			}),
		});

		const command = new DoctorCommand();
		const { stdout } = assignCommandContext(command);

		const exitCode = await command.execute();
		expect(exitCode).toBe(WPK_EXIT_CODES.SUCCESS);
		expect(printerAccessRuntime).toHaveBeenCalled();
		expect(stdout.toString()).toContain('[WARN] PHP runtime');
	});

	it('fails when the PHP printer path cannot be resolved', async () => {
		const { buildDoctorCommand } = await import('../doctor');

		const loadWPKernelConfig = jest.fn().mockResolvedValue({
			config: {},
			sourcePath: path.join(process.cwd(), 'wpk.config.ts'),
			configOrigin: 'wpk.config.ts',
			namespace: 'Demo\\Plugin\\',
		});
		const phpRuntimeExec = createExecMock<PhpRuntimeDependencies['exec']>({
			stdout: 'PHP 8.1.0',
			stderr: '',
		});
		const printerRealpathMissing = createPromiseMock<
			PhpPrinterPathDependencies['realpath']
		>((..._args) => {
			throw new Error('missing asset');
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
				composer: {
					pathExists: jest.fn().mockResolvedValue(true),
				},
				phpRuntime: {
					exec: phpRuntimeExec,
				},
				phpPrinterPath: {
					access: mockFs.access,
					realpath: printerRealpathMissing,
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
		const phpRuntimeExec = createExecMock<PhpRuntimeDependencies['exec']>({
			stdout: 'PHP 8.1.0',
			stderr: '',
		});
		const printerAccessComposer = createPromiseMock<
			PhpPrinterPathDependencies['access']
		>((..._args) => undefined);
		const printerRealpathComposer = createPromiseMock<
			PhpPrinterPathDependencies['realpath']
		>((..._args) => path.join(process.cwd(), 'packages', 'cli'));

		const loadWPKernelConfig = jest.fn().mockResolvedValue({
			config: {},
			sourcePath: path.join(process.cwd(), 'wpk.config.ts'),
			configOrigin: 'wpk.config.ts',
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
			buildReadinessRegistry: createReadinessBuilder({
				composer: {
					pathExists: jest.fn().mockResolvedValue(false),
				},
				phpRuntime: {
					exec: phpRuntimeExec,
				},
				phpPrinterPath: {
					access: printerAccessComposer,
					realpath: printerRealpathComposer,
				},
			}),
		});

		const command = new DoctorCommand();
		const { stdout } = assignCommandContext(command);

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.SUCCESS);
		expect(printerAccessComposer).toHaveBeenCalled();
		expect(stdout.toString()).toContain('[WARN] Bundled PHP autoload');
	});
});

function createReadinessBuilder(
	overrides: DefaultReadinessHelperOverrides = {}
) {
	const quickstartDeps = createQuickstartDepsMock();
	const bootstrapperDeps = createBootstrapperDependenciesMock();
	const releasePackDeps = createReleasePackDependenciesMock();

	const helperOverrides: DefaultReadinessHelperOverrides = {
		workspaceHygiene: {
			readGitStatus: jest.fn().mockResolvedValue([]),
			...(overrides.workspaceHygiene ?? {}),
		},
		composer: {
			pathExists: mockFs.exists,
			...(overrides.composer ?? {}),
		},
		phpRuntime: overrides.phpRuntime,
		phpPrinterPath: {
			access: createPromiseMock<PhpPrinterPathDependencies['access']>(
				(..._args) => undefined
			),
			...(overrides.phpPrinterPath ?? {}),
		},
		phpCodemodIngestion: overrides.phpCodemodIngestion,
		git: overrides.git,
		tsxRuntime: overrides.tsxRuntime,
		releasePack: mergeReleasePackOverrides(overrides.releasePack, {
			manifest: [],
			dependencies: {
				access: releasePackDeps.access,
				exec: releasePackDeps.exec,
			},
		}),
		bootstrapperResolution: mergeBootstrapperOverrides(
			overrides.bootstrapperResolution,
			{
				dependencies: bootstrapperDeps,
			}
		),
		quickstart: mergeQuickstartOverrides(overrides.quickstart, {
			dependencies: quickstartDeps,
		}),
	};

	return (options?: BuildDefaultReadinessRegistryOptions) =>
		buildDefaultReadinessRegistry({
			...(options ?? {}),
			helperOverrides: {
				...helperOverrides,
				...(options?.helperOverrides ?? {}),
			},
		});
}

function mergeReleasePackOverrides(
	overrides: ReleasePackHelperOptions | undefined,
	defaults: ReleasePackHelperOptions
): ReleasePackHelperOptions {
	return {
		manifest: overrides?.manifest ?? defaults.manifest,
		dependencies: {
			...(defaults.dependencies ?? {}),
			...(overrides?.dependencies ?? {}),
		},
	};
}

function mergeBootstrapperOverrides(
	overrides: BootstrapperResolutionHelperOptions | undefined,
	defaults: BootstrapperResolutionHelperOptions
): BootstrapperResolutionHelperOptions {
	return {
		...defaults,
		...(overrides ?? {}),
		dependencies: {
			...(defaults.dependencies ?? {}),
			...(overrides?.dependencies ?? {}),
		},
	};
}

function mergeQuickstartOverrides(
	overrides: QuickstartHelperOptions | undefined,
	defaults: QuickstartHelperOptions
): QuickstartHelperOptions {
	return {
		...defaults,
		...(overrides ?? {}),
		dependencies: {
			...(defaults.dependencies ?? {}),
			...(overrides?.dependencies ?? {}),
		},
	};
}

function createReleasePackDependenciesMock(): ReleasePackDependencies {
	const access = createPromiseMock<ReleasePackDependencies['access']>(
		(..._args) => undefined
	);
	const exec = createExecMock<ReleasePackDependencies['exec']>();
	return { access, exec };
}

function createBootstrapperDependenciesMock(): BootstrapperResolutionDependencies {
	const access = createPromiseMock<
		BootstrapperResolutionDependencies['access']
	>((..._args) => undefined);
	const mkdtemp = createPromiseMock<
		BootstrapperResolutionDependencies['mkdtemp']
	>((...args) => {
		const [prefix] = args;
		const base = String(prefix ?? '');
		return `${base}bootstrapper`;
	});
	const rm = createPromiseMock<BootstrapperResolutionDependencies['rm']>(
		(..._args) => undefined
	);
	const exec = createExecMock<BootstrapperResolutionDependencies['exec']>();
	return { access, mkdtemp, rm, exec };
}

function createExecMock<
	T extends (
		...args: any[]
	) => PromiseWithChild<{ stdout: string; stderr: string }>,
>(
	result: { stdout: string; stderr: string } = { stdout: '', stderr: '' }
): jest.MockedFunction<T> {
	return jest.fn((..._args: Parameters<T>) =>
		makePromiseWithChild(result)
	) as unknown as jest.MockedFunction<T>;
}

function createRejectingExecMock<
	T extends (
		...args: any[]
	) => PromiseWithChild<{ stdout: string; stderr: string }>,
>(error: Error): jest.MockedFunction<T> {
	return jest.fn((..._args: Parameters<T>) => {
		const promise = Promise.reject(error) as PromiseWithChild<never>;
		promise.child = new EventEmitter() as unknown as ChildProcess;
		return promise as ReturnType<T>;
	}) as unknown as jest.MockedFunction<T>;
}

function createPromiseMock<T extends (...args: any[]) => Promise<unknown>>(
	impl: (...args: Parameters<T>) => Awaited<ReturnType<T>>
): jest.MockedFunction<T> {
	return jest.fn((...args: Parameters<T>) => {
		try {
			return Promise.resolve(impl(...args)) as ReturnType<T>;
		} catch (error) {
			return Promise.reject(error) as ReturnType<T>;
		}
	}) as unknown as jest.MockedFunction<T>;
}

function makePromiseWithChild<T>(value: T): PromiseWithChild<T> {
	const promise = Promise.resolve(value) as PromiseWithChild<T>;
	promise.child = new EventEmitter() as unknown as ChildProcess;
	return promise;
}
