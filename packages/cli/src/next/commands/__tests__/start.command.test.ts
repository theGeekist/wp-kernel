import { EventEmitter } from 'node:events';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import type { FSWatcher } from 'chokidar';
import { Command } from 'clipanion';
import { WPK_EXIT_CODES } from '@wpkernel/core/contracts';
import { assignCommandContext, flushAsync } from '@wpkernel/test-utils/cli';
import {
	buildStartCommand,
	detectTier,
	prioritiseQueued,
	type Trigger,
} from '../start';

const fsAccess = jest.fn<Promise<void>, [string]>();
const fsMkdir = jest.fn<Promise<void>, [string, { recursive: boolean }]>();
const fsCp = jest.fn<Promise<void>, [string, string, { recursive: boolean }]>();

const loadWatch = jest.fn<Promise<WatchFactory>, []>();
const watchFactory = jest.fn<FSWatcher, [string[], WatchOptions]>();
const spawnViteProcess = jest.fn<FakeChildProcess, []>();
const reporterFactory = jest.fn(createReporterMock);

const flushTimers = () => flushAsync({ runAllTimers: true });
const pathResolve = path.resolve.bind(path);

describe('buildStartCommand', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		fsAccess.mockResolvedValue(undefined);
		fsMkdir.mockResolvedValue(undefined);
		fsCp.mockResolvedValue(undefined);
		loadWatch.mockResolvedValue(watchFactory);
		watchFactory.mockImplementation(
			() => new FakeWatcher() as unknown as FSWatcher
		);
		spawnViteProcess.mockImplementation(() => new FakeChildProcess());
		reporterFactory.mockImplementation(createReporterMock);
		FakeGenerateCommand.executeMock.mockResolvedValue(
			WPK_EXIT_CODES.SUCCESS
		);
	});

	afterEach(() => {
		jest.useRealTimers();
		jest.clearAllMocks();
	});

	it('performs initial generation and responds to fast changes', async () => {
		const { watcher, stdout, executePromise } = await buildCommand();

		expect(FakeGenerateCommand.executeMock).toHaveBeenCalledTimes(1);

		watcher.emit('all', 'change', 'kernel.config.ts');
		await flushTimers();
		expect(FakeGenerateCommand.executeMock).toHaveBeenCalledTimes(1);

		jest.advanceTimersByTime(FAST_DEBOUNCE_MS - 1);
		await flushTimers();
		expect(FakeGenerateCommand.executeMock).toHaveBeenCalledTimes(1);

		jest.advanceTimersByTime(1);
		await flushTimers();
		expect(FakeGenerateCommand.executeMock).toHaveBeenCalledTimes(2);

		await shutdown(executePromise);

		expect(watcher.close).toHaveBeenCalledTimes(1);
		expect(stdout.toString()).toContain('[summary]');
	});

	it('uses slow debounce for schema changes and overrides fast triggers', async () => {
		const { watcher, executePromise } = await buildCommand();

		watcher.emit('all', 'change', 'kernel.config.ts');
		watcher.emit(
			'all',
			'change',
			path.join('contracts', 'job.schema.json')
		);

		jest.advanceTimersByTime(FAST_DEBOUNCE_MS);
		await flushTimers();
		expect(FakeGenerateCommand.executeMock).toHaveBeenCalledTimes(1);

		jest.advanceTimersByTime(SLOW_DEBOUNCE_MS);
		await flushTimers();
		expect(FakeGenerateCommand.executeMock).toHaveBeenCalledTimes(2);

		await shutdown(executePromise);
	});

	it('handles watcher errors without crashing', async () => {
		const { watcher, executePromise } = await buildCommand();

		watcher.emit('error', new Error('watcher failure'));
		watcher.emit('all', 'change', 'kernel.config.ts');

		await jest.advanceTimersByTimeAsync(FAST_DEBOUNCE_MS + 1);
		await flushTimers();
		expect(FakeGenerateCommand.executeMock).toHaveBeenCalledTimes(2);

		await shutdown(executePromise);
	});

	it('auto-applies PHP artifacts when enabled', async () => {
		const { command, watcher, executePromise } = await buildCommand({
			autoApplyPhp: true,
		});

		expect(fsMkdir).toHaveBeenCalledTimes(1);
		await expectEventually(() => {
			expect(fsCp).toHaveBeenCalledTimes(1);
		});

		watcher.emit('all', 'change', 'kernel.config.ts');
		await jest.advanceTimersByTimeAsync(FAST_DEBOUNCE_MS + 1);
		await flushTimers();

		expect(FakeGenerateCommand.executeMock).toHaveBeenCalledTimes(2);
		await expectEventually(() => {
			expect(fsCp).toHaveBeenCalledTimes(2);
		});

		await shutdown(executePromise);
		expect(command.autoApplyPhp).toBe(true);
	});

	it('skips auto-apply when PHP artifacts are missing', async () => {
		fsAccess.mockRejectedValueOnce(new Error('missing output'));

		const { executePromise } = await buildCommand({
			autoApplyPhp: true,
		});

		expect(fsCp).not.toHaveBeenCalled();
		await shutdown(executePromise);
	});

	it('queues additional changes while a run is in progress', async () => {
		let resolveFirst: (() => void) | undefined;
		FakeGenerateCommand.executeMock
			.mockImplementationOnce(
				() =>
					new Promise((resolve) => {
						resolveFirst = () => resolve(WPK_EXIT_CODES.SUCCESS);
					})
			)
			.mockResolvedValue(WPK_EXIT_CODES.SUCCESS);

		const { watcher, executePromise } = await buildCommand();

		watcher.emit('all', 'change', 'kernel.config.ts');
		await jest.advanceTimersByTimeAsync(FAST_DEBOUNCE_MS + 1);
		await flushTimers();
		expect(FakeGenerateCommand.executeMock).toHaveBeenCalledTimes(1);

		resolveFirst?.();
		await flushTimers();
		await jest.advanceTimersByTimeAsync(FAST_DEBOUNCE_MS + 1);
		await flushTimers();
		expect(FakeGenerateCommand.executeMock).toHaveBeenCalledTimes(2);

		await shutdown(executePromise, ['SIGINT', 'SIGTERM']);
	});

	it('clears pending timers when shutting down with queued triggers', async () => {
		const { watcher, executePromise } = await buildCommand();

		watcher.emit('all', 'change', 'kernel.config.ts');
		await flushTimers();
		await shutdown(executePromise);

		expect(FakeGenerateCommand.executeMock).toHaveBeenCalledTimes(1);
	});

	it('restarts debounce timers when repeated fast events arrive', async () => {
		const { watcher, executePromise } = await buildCommand();

		watcher.emit('all', 'change', 'kernel.config.ts');
		await flushTimers();
		watcher.emit('all', 'change', 'kernel.config.ts');
		await flushTimers();

		await jest.advanceTimersByTimeAsync(FAST_DEBOUNCE_MS - 1);
		await flushTimers();
		expect(FakeGenerateCommand.executeMock).toHaveBeenCalledTimes(1);

		await jest.advanceTimersByTimeAsync(1);
		await flushTimers();
		expect(FakeGenerateCommand.executeMock).toHaveBeenCalledTimes(2);

		await shutdown(executePromise);
	});

	it('retains queued triggers while generation is running', async () => {
		let resolveGeneration: ((code: number) => void) | null = null;
		FakeGenerateCommand.executeMock
			.mockImplementationOnce(
				() =>
					new Promise<number>((resolve) => {
						resolveGeneration = resolve;
					})
			)
			.mockResolvedValueOnce(WPK_EXIT_CODES.SUCCESS);

		const { watcher, executePromise } = await buildCommand();
		const reporter = reporterFactory.mock.results[0]!.value as ReporterMock;

		watcher.emit('all', 'change', 'kernel.config.ts');
		await flushTimers();

		watcher.emit('all', 'change', 'kernel.config.ts');
		await flushTimers();

		expect(reporter.debug).toHaveBeenCalledWith(
			'Queueing change while generation is running.',
			expect.objectContaining({
				event: 'change',
				file: 'kernel.config.ts',
				tier: 'fast',
			})
		);

		resolveGeneration?.(WPK_EXIT_CODES.SUCCESS);
		await flushTimers();

		await shutdown(executePromise);
	});

	it('reports unexpected errors from the generation cycle', async () => {
		const failure = new Error('cycle failure');
		let runCycleSpy: jest.SpyInstance | undefined;

		const { executePromise } = await buildCommand({
			beforeInstantiate: (StartCommand) => {
				runCycleSpy = jest
					.spyOn(
						StartCommand.prototype as unknown as {
							runCycle: (typeof StartCommand.prototype)['runCycle'];
						},
						'runCycle'
					)
					.mockRejectedValueOnce(failure)
					.mockResolvedValue(undefined);
			},
		});

		try {
			const reporter = reporterFactory.mock.results[0]!
				.value as ReporterMock;

			await expectEventually(() => {
				expect(reporter.error).toHaveBeenCalledWith(
					'Unexpected error during generation cycle.',
					expect.objectContaining({ message: failure.message })
				);
			});

			await shutdown(executePromise);
		} finally {
			runCycleSpy?.mockRestore();
		}
	});

	it('warns when generation completes with errors', async () => {
		const command = createStartCommandInstance();
		const reporter = createReporterMock();
		const generateReporter = createReporterMock();

		FakeGenerateCommand.executeMock.mockReset();
		FakeGenerateCommand.executeMock.mockResolvedValue(
			WPK_EXIT_CODES.SUCCESS
		);
		FakeGenerateCommand.executeMock.mockImplementationOnce(
			async () => WPK_EXIT_CODES.UNEXPECTED_ERROR
		);

		await (
			command as unknown as {
				runCycle: (options: {
					trigger: Trigger;
					reporter: ReporterMock;
					generateReporter: ReporterMock;
				}) => Promise<void>;
			}
		).runCycle({
			trigger: {
				tier: 'fast',
				event: 'change',
				file: 'kernel.config.ts',
			},
			reporter,
			generateReporter,
		});

		expect(FakeGenerateCommand.executeMock).toHaveBeenCalledTimes(1);
		await expect(
			FakeGenerateCommand.executeMock.mock.results[0]?.value
		).resolves.toBe(WPK_EXIT_CODES.UNEXPECTED_ERROR);
		expect(reporter.warn).toHaveBeenCalledWith(
			'Generation completed with errors.',
			{ exitCode: WPK_EXIT_CODES.UNEXPECTED_ERROR }
		);
		expect(generateReporter.warn).not.toHaveBeenCalled();
	});

	it('logs errors when the generation pipeline throws', async () => {
		const command = createStartCommandInstance();
		const reporter = createReporterMock();
		const generateReporter = createReporterMock();
		const failure = new Error('pipeline failure');

		FakeGenerateCommand.executeMock.mockReset();
		FakeGenerateCommand.executeMock.mockResolvedValue(
			WPK_EXIT_CODES.SUCCESS
		);
		FakeGenerateCommand.executeMock.mockImplementationOnce(async () => {
			throw failure;
		});

		await (
			command as unknown as {
				runCycle: (options: {
					trigger: Trigger;
					reporter: ReporterMock;
					generateReporter: ReporterMock;
				}) => Promise<void>;
			}
		).runCycle({
			trigger: {
				tier: 'fast',
				event: 'change',
				file: 'kernel.config.ts',
			},
			reporter,
			generateReporter,
		});

		expect(FakeGenerateCommand.executeMock).toHaveBeenCalledTimes(1);
		await expect(
			FakeGenerateCommand.executeMock.mock.results[0]?.value
		).rejects.toThrow('pipeline failure');
		expect(reporter.error).toHaveBeenCalledWith(
			'Generation pipeline failed to execute.',
			expect.objectContaining({ message: failure.message })
		);
	});

	it('logs watcher errors', async () => {
		const { watcher, executePromise } = await buildCommand();
		const reporter = reporterFactory.mock.results[0]!.value as ReporterMock;

		const error = new Error('watch failure');
		watcher.emit('error', error);
		await flushTimers();

		await shutdown(executePromise);

		expect(reporter.error).toHaveBeenCalledWith(
			'Watcher error.',
			expect.objectContaining({ message: error.message })
		);
	});

	it('warns when watcher close fails during shutdown', async () => {
		watchFactory.mockImplementationOnce(() => {
			const watcher = new FakeWatcher();
			watcher.close.mockRejectedValueOnce(new Error('close failure'));
			return watcher as unknown as FSWatcher;
		});

		const { executePromise } = await buildCommand();
		const reporter = reporterFactory.mock.results[0]!.value as ReporterMock;

		await shutdown(executePromise);

		expect(reporter.warn).toHaveBeenCalledWith(
			'Failed to close watcher.',
			expect.objectContaining({ message: 'close failure' })
		);
	});

	it('stops the Vite dev server on shutdown', async () => {
		const { executePromise } = await buildCommand();
		const child = spawnViteProcess.mock.results[0]!.value;

		await shutdown(executePromise);

		expect(child.kill).toHaveBeenCalledWith('SIGINT');
	});

	it('spawns Vite using the default implementation when no override is provided', async () => {
		jest.resetModules();
		const spawnMock = jest.fn(() => new FakeChildProcess());
		jest.doMock('node:child_process', () => ({
			spawn: spawnMock,
			execFile: jest.fn(),
		}));

		const { buildStartCommand: importBuildStartCommand } = await import(
			'../start'
		);

		const StartCommand = importBuildStartCommand({
			loadWatch,
			buildReporter: reporterFactory,
			buildGenerateCommand: () =>
				FakeGenerateCommand as unknown as GenerateConstructor,
			adoptCommandEnvironment: jest.fn(),
			fileSystem: {
				access: fsAccess,
				mkdir: fsMkdir,
				cp: fsCp,
			},
		});

		const command = new StartCommand();
		assignCommandContext(command);

		const executePromise = command.execute();
		await flushTimers();
		process.emit('SIGINT');
		await flushTimers();
		await executePromise;

		expect(spawnMock).toHaveBeenCalledWith(
			'pnpm',
			['exec', 'vite'],
			expect.objectContaining({ cwd: process.cwd() })
		);

		jest.resetModules();
		jest.dontMock('node:child_process');
		jest.unmock('node:child_process');
	});

	it('logs debug output when the Vite dev server is already stopped', async () => {
		spawnViteProcess.mockImplementationOnce(() => {
			const child = new FakeChildProcess();
			child.kill.mockImplementation(() => {
				queueMicrotask(() => child.emit('exit', 0, null));
				return false;
			});
			return child;
		});

		const { executePromise } = await buildCommand();
		const reporter = reporterFactory.mock.results[0]!.value as ReporterMock;
		const viteReporter = getReporterChild(reporter, 'vite');

		await shutdown(executePromise);

		expect(viteReporter.debug).toHaveBeenCalledWith(
			'Vite dev server already stopped.'
		);
	});

	it('warns when the Vite dev server requires SIGTERM to exit', async () => {
		spawnViteProcess.mockImplementationOnce(() => {
			const child = new FakeChildProcess();
			let sigintHandled = false;
			child.kill.mockImplementation((signal?: NodeJS.Signals) => {
				if (signal === 'SIGINT') {
					sigintHandled = true;
					return true;
				}
				if (signal === 'SIGTERM' && sigintHandled) {
					child.killed = true;
					queueMicrotask(() => child.emit('exit', 0, signal ?? null));
					return true;
				}
				return false;
			});
			return child;
		});

		const { executePromise } = await buildCommand();
		const reporter = reporterFactory.mock.results[0]!.value as ReporterMock;
		const viteReporter = getReporterChild(reporter, 'vite');

		process.emit('SIGINT');
		await jest.advanceTimersByTimeAsync(2000);
		await flushTimers();
		await executePromise;

		expect(viteReporter.warn).toHaveBeenCalledWith(
			'Vite dev server did not exit, sending SIGTERM.'
		);
		const child = spawnViteProcess.mock.results[0]!.value;
		expect(child.kill).toHaveBeenCalledWith('SIGTERM');
	});

	it('skips killing the Vite dev server when it already exited', async () => {
		spawnViteProcess.mockImplementationOnce(() => {
			const child = new FakeChildProcess();
			child.killed = true;
			queueMicrotask(() => child.emit('exit', 0, null));
			return child;
		});

		const { executePromise } = await buildCommand();
		const child = spawnViteProcess.mock.results[0]!.value;

		await shutdown(executePromise);

		expect(child.kill).not.toHaveBeenCalled();
	});

	it('logs when the Vite dev server is already stopped', async () => {
		spawnViteProcess.mockImplementationOnce(() => {
			const child = new FakeChildProcess();
			child.kill.mockImplementation(() => {
				queueMicrotask(() => child.emit('exit', 0, null));
				return false;
			});
			return child;
		});

		const { executePromise } = await buildCommand();
		const reporter = reporterFactory.mock.results[0]!.value as ReporterMock;

		await shutdown(executePromise);

		const viteReporter = getReporterChild(reporter, 'vite');
		expect(viteReporter.debug).toHaveBeenCalledWith(
			'Vite dev server already stopped.'
		);
	});

	it('logs Vite process errors', async () => {
		const { executePromise } = await buildCommand();
		const reporter = reporterFactory.mock.results[0]!.value as ReporterMock;
		const child = spawnViteProcess.mock.results[0]!.value;

		child.emit('error', new Error('vite crash'));
		await flushTimers();

		await shutdown(executePromise);

		const viteReporter = getReporterChild(reporter, 'vite');
		expect(viteReporter.error).toHaveBeenCalledWith(
			'Vite dev server error.',
			expect.objectContaining({
				error: expect.objectContaining({
					message: 'vite crash',
				}),
			})
		);
	});

	it('returns error exit code when Vite fails to launch', async () => {
		const error = new Error('spawn failure');
		spawnViteProcess.mockImplementation(() => {
			throw error;
		});

		const StartCommand = buildStartCommand({
			loadWatch,
			spawnViteProcess,
			buildReporter: reporterFactory,
			buildGenerateCommand: () =>
				FakeGenerateCommand as unknown as GenerateConstructor,
			fileSystem: {
				access: fsAccess,
				mkdir: fsMkdir,
				cp: fsCp,
			},
		});

		const command = new StartCommand();
		assignCommandContext(command);

		const exitCode = await command.execute();
		expect(exitCode).toBe(WPK_EXIT_CODES.UNEXPECTED_ERROR);
		expect(loadWatch).not.toHaveBeenCalled();
	});

	it('detects slow tiers for contract and schema paths', () => {
		expect(detectTier('contracts/item.schema.json')).toBe('slow');
		expect(detectTier('schemas/foo.json')).toBe('slow');
		expect(detectTier(path.resolve('schemas/absolute.json'))).toBe('slow');
		expect(detectTier('src/resources/post.ts')).toBe('fast');
		expect(detectTier(process.cwd())).toBe('fast');
	});

	it('prioritises queued triggers preferring slow changes', () => {
		const fastTrigger: Trigger = {
			tier: 'fast',
			event: 'change',
			file: 'kernel.config.ts',
		};
		const slowTrigger: Trigger = {
			tier: 'slow',
			event: 'change',
			file: 'contracts/item.schema.json',
		};
		const anotherFast: Trigger = {
			tier: 'fast',
			event: 'change',
			file: 'kernel.config.ts',
		};

		expect(prioritiseQueued(null, fastTrigger)).toBe(fastTrigger);
		expect(prioritiseQueued(fastTrigger, slowTrigger)).toBe(slowTrigger);
		expect(prioritiseQueued(slowTrigger, fastTrigger)).toBe(slowTrigger);
		expect(prioritiseQueued(fastTrigger, anotherFast)).toBe(anotherFast);
	});

	it('reports when auto-apply fails to copy artifacts', async () => {
		const copyError = new Error('copy failure');
		fsCp.mockRejectedValueOnce(copyError);

		const { executePromise } = await buildCommand({
			autoApplyPhp: true,
		});

		const reporter = reporterFactory.mock.results[0]!.value as ReporterMock;
		const applyReporter = getReporterChild(reporter, 'apply');
		const generateReporter = getReporterChild(reporter, 'generate');

		await expectEventually(() => {
			expect(applyReporter.warn).toHaveBeenCalledWith(
				'Failed to auto-apply PHP artifacts.',
				expect.objectContaining({ message: copyError.message })
			);
			expect(generateReporter.warn).toHaveBeenCalledWith(
				'Failed to auto-apply PHP artifacts.',
				expect.objectContaining({ message: copyError.message })
			);
		});

		await shutdown(executePromise);
	});

	it('formats workspace-relative paths when auto-applying artifacts', async () => {
		const resolveSpy = jest
			.spyOn(path, 'resolve')
			.mockImplementation((...segments: string[]) => {
				if (
					segments[0] === process.cwd() &&
					segments[1] === '.generated/php'
				) {
					return process.cwd();
				}
				if (segments[0] === process.cwd() && segments[1] === 'inc') {
					return path.join(process.cwd(), 'inc');
				}

				return pathResolve(...segments);
			});

		const StartCommand = buildStartCommand({
			loadWatch,
			spawnViteProcess,
			buildReporter: reporterFactory,
			buildGenerateCommand: () =>
				FakeGenerateCommand as unknown as GenerateConstructor,
			fileSystem: {
				access: fsAccess,
				mkdir: fsMkdir,
				cp: fsCp,
			},
		});

		const command = new StartCommand();
		const reporter = createReporterMock();
		const generateReporter = createReporterMock();

		await (
			command as unknown as {
				autoApplyPhpArtifacts: (
					reporter: ReporterMock,
					generateReporter: ReporterMock
				) => Promise<void>;
			}
		).autoApplyPhpArtifacts(
			reporter as unknown as ReporterMock,
			generateReporter as unknown as ReporterMock
		);

		expect(reporter.info).toHaveBeenCalledWith(
			'Applied generated PHP artifacts.',
			expect.objectContaining({
				source: '.',
				target: 'inc',
			})
		);

		resolveSpy.mockRestore();
	});

	it('loads chokidar.watch when exported at the top level', async () => {
		const watchSpy = jest
			.fn(() => new FakeWatcher() as unknown as FSWatcher)
			.mockName('top-level-watch');

		jest.resetModules();
		jest.doMock('chokidar', () => ({ watch: watchSpy }));

		const { buildStartCommand: importBuildStartCommand } = await import(
			'../start'
		);

		const StartCommand = importBuildStartCommand({
			buildReporter: () => createReporterMock(),
			buildGenerateCommand: () =>
				FakeGenerateCommand as unknown as GenerateConstructor,
			adoptCommandEnvironment: jest.fn(),
			fileSystem: {
				access: fsAccess,
				mkdir: fsMkdir,
				cp: fsCp,
			},
			spawnViteProcess: () => new FakeChildProcess(),
		});

		const command = new StartCommand();
		assignCommandContext(command);

		const executePromise = command.execute();
		await flushTimers();
		process.emit('SIGINT');
		await flushTimers();
		await executePromise;

		expect(watchSpy).toHaveBeenCalled();

		jest.resetModules();
	});

	it('loads chokidar from the module default export when it is a function', async () => {
		const watchSpy = jest
			.fn(() => new FakeWatcher() as unknown as FSWatcher)
			.mockName('default-function-watch');

		jest.resetModules();
		jest.doMock('chokidar', () => ({
			__esModule: true,
			default: watchSpy,
		}));

		const { buildStartCommand: importBuildStartCommand } = await import(
			'../start'
		);

		const StartCommand = importBuildStartCommand({
			buildReporter: () => createReporterMock(),
			buildGenerateCommand: () =>
				FakeGenerateCommand as unknown as GenerateConstructor,
			adoptCommandEnvironment: jest.fn(),
			fileSystem: {
				access: fsAccess,
				mkdir: fsMkdir,
				cp: fsCp,
			},
			spawnViteProcess: () => new FakeChildProcess(),
		});

		const command = new StartCommand();
		assignCommandContext(command);

		const executePromise = command.execute();
		await flushTimers();
		process.emit('SIGINT');
		await flushTimers();
		await executePromise;

		expect(watchSpy).toHaveBeenCalled();

		jest.resetModules();
	});

	it('loads chokidar watch from the module default object when available', async () => {
		const watchSpy = jest
			.fn(() => new FakeWatcher() as unknown as FSWatcher)
			.mockName('default-object-watch');

		jest.resetModules();
		jest.doMock('chokidar', () => ({
			__esModule: true,
			default: { watch: watchSpy },
		}));

		const { buildStartCommand: importBuildStartCommand } = await import(
			'../start'
		);

		const StartCommand = importBuildStartCommand({
			buildReporter: () => createReporterMock(),
			buildGenerateCommand: () =>
				FakeGenerateCommand as unknown as GenerateConstructor,
			adoptCommandEnvironment: jest.fn(),
			fileSystem: {
				access: fsAccess,
				mkdir: fsMkdir,
				cp: fsCp,
			},
			spawnViteProcess: () => new FakeChildProcess(),
		});

		const command = new StartCommand();
		assignCommandContext(command);

		const executePromise = command.execute();
		await flushTimers();
		process.emit('SIGINT');
		await flushTimers();
		await executePromise;

		expect(watchSpy).toHaveBeenCalled();

		jest.resetModules();
	});

	it('throws a developer error when chokidar does not expose a watch function', async () => {
		jest.resetModules();
		jest.doMock('chokidar', () => ({}));

		const { buildStartCommand: importBuildStartCommand } = await import(
			'../start'
		);

		const StartCommand = importBuildStartCommand({
			buildReporter: () => createReporterMock(),
			buildGenerateCommand: () =>
				FakeGenerateCommand as unknown as GenerateConstructor,
			adoptCommandEnvironment: jest.fn(),
			fileSystem: {
				access: fsAccess,
				mkdir: fsMkdir,
				cp: fsCp,
			},
			spawnViteProcess: () => new FakeChildProcess(),
		});

		const command = new StartCommand();
		assignCommandContext(command);

		await expect(command.execute()).rejects.toMatchObject({
			message: 'Unable to resolve chokidar.watch for CLI start command.',
		});

		jest.resetModules();
	});
});

function createStartCommandInstance() {
	const StartCommand = buildStartCommand({
		loadWatch,
		spawnViteProcess,
		buildReporter: reporterFactory,
		buildGenerateCommand: () =>
			FakeGenerateCommand as unknown as GenerateConstructor,
		fileSystem: {
			access: fsAccess,
			mkdir: fsMkdir,
			cp: fsCp,
		},
		adoptCommandEnvironment: jest.fn(),
	});

	const command = new StartCommand();
	assignCommandContext(command);
	return command;
}

async function buildCommand({
	autoApplyPhp = false,
	beforeInstantiate,
}: {
	autoApplyPhp?: boolean;
	beforeInstantiate?: (
		StartCommand: ReturnType<typeof buildStartCommand>
	) => void;
} = {}) {
	const StartCommand = buildStartCommand({
		loadWatch,
		spawnViteProcess,
		buildReporter: reporterFactory,
		buildGenerateCommand: () =>
			FakeGenerateCommand as unknown as GenerateConstructor,
		fileSystem: {
			access: fsAccess,
			mkdir: fsMkdir,
			cp: fsCp,
		},
	});

	beforeInstantiate?.(StartCommand);

	const command = new StartCommand();
	command.autoApplyPhp = autoApplyPhp;
	const { stdout } = assignCommandContext(command);

	const executePromise = command.execute();
	await flushTimers();

	const watcher = watchFactory.mock.results[0]
		?.value as unknown as FakeWatcher;
	if (!watcher) {
		throw new Error('Expected watcher to be created');
	}

	return { command, watcher, stdout, executePromise };
}

async function shutdown(
	executePromise: ReturnType<
		ReturnType<typeof buildStartCommand>['prototype']['execute']
	>,
	signals: NodeJS.Signals[] = ['SIGINT']
): Promise<void> {
	for (const signal of signals) {
		process.emit(signal);
	}
	await flushTimers();
	await executePromise;
}

async function expectEventually(assertion: () => void): Promise<void> {
	for (let attempt = 0; attempt < 5; attempt += 1) {
		try {
			assertion();
			return;
		} catch (error) {
			if (attempt === 4) {
				throw error;
			}
			await flushTimers();
		}
	}
}

function getReporterChild(
	reporter: ReporterMock,
	namespace: string
): ReporterMock {
	const index = reporter.child.mock.calls.findIndex(
		([label]) => label === namespace
	);
	if (index === -1) {
		throw new Error(`Reporter child ${namespace} not found`);
	}

	return reporter.child.mock.results[index]!.value as ReporterMock;
}

type WatchOptions = {
	readonly cwd: string;
	readonly ignoreInitial: boolean;
	readonly ignored: readonly string[];
};

type WatchFactory = (
	patterns: readonly string[],
	options: WatchOptions
) => FSWatcher;

type GenerateConstructor = new () => Command;

class FakeGenerateCommand extends Command {
	static readonly executeMock = jest.fn<Promise<number>, []>();

	dryRun = false;
	verbose = false;

	override async execute(): Promise<number> {
		const result = await FakeGenerateCommand.executeMock.call(this);
		if (result === WPK_EXIT_CODES.SUCCESS) {
			this.context.stdout.write('[summary]\n');
		}
		return result;
	}
}

class FakeWatcher extends EventEmitter {
	close = jest.fn(async () => {
		this.emit('close');
	});
}

class FakeChildProcess extends EventEmitter {
	stdout = new PassThrough();
	stderr = new PassThrough();
	killed = false;

	kill = jest.fn((signal?: NodeJS.Signals) => {
		if (this.killed) {
			return false;
		}
		this.killed = true;
		queueMicrotask(() => {
			this.emit('exit', 0, signal ?? null);
		});
		return true;
	});
}

function createReporterMock() {
	const reporter = {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
		child: jest.fn(() => createReporterMock()),
	} as unknown as ReporterMock;
	return reporter;
}

type ReporterMock = {
	info: jest.Mock;
	warn: jest.Mock;
	error: jest.Mock;
	debug: jest.Mock;
	child: jest.Mock<ReporterMock, [string]>;
};

const FAST_DEBOUNCE_MS = 200;
const SLOW_DEBOUNCE_MS = 600;
