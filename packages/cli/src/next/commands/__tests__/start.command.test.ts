import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Dirent } from 'node:fs';
import { PassThrough } from 'node:stream';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import type { Reporter } from '@wpkernel/core/reporter';
import { WPK_EXIT_CODES } from '@wpkernel/core/contracts';
import { assignCommandContext, flushAsync } from '@wpkernel/test-utils/cli';
import { buildStartCommand, type BuildStartCommandOptions } from '../start';
import { runGeneration, type GenerationRunResult } from '../generate/runtime';
import chokidar from 'chokidar';

jest.mock('node:fs/promises', () => ({
	access: jest.fn(),
	mkdir: jest.fn(),
	cp: jest.fn(),
	readdir: jest.fn(),
	rm: jest.fn(),
}));

jest.mock('chokidar', () => ({
	watch: jest.fn(),
}));

jest.mock('../generate/runtime', () => {
	const runGenerationMockFn = jest.fn();
	const mergeDependencies = jest.fn(
		(options: Record<string, unknown> = {}) => ({
			loadKernelConfig: jest.fn(),
			buildWorkspace: jest.fn(),
			createPipeline: jest.fn(),
			registerFragments: jest.fn(),
			registerBuilders: jest.fn(),
			buildAdapterExtensionsExtension: jest.fn(),
			renderSummary: jest.fn(),
			validateGeneratedImports: jest.fn(),
			...options,
		})
	);

	return {
		__esModule: true,
		mergeDependencies,
		runGeneration: runGenerationMockFn,
	};
});

const runGenerationMock = runGeneration as jest.MockedFunction<
	typeof runGeneration
>;
const watchMock = chokidar.watch as jest.MockedFunction<typeof chokidar.watch>;
const mockedFs = fs as jest.Mocked<typeof fs>;

const flushTimers = () => flushAsync({ runAllTimers: true });

describe('NextStartCommand', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		stubRunGeneration({
			exitCode: WPK_EXIT_CODES.SUCCESS,
			summary: null,
			output: 'summary\n',
		});
		watchMock.mockImplementation(
			() => new FakeWatcher() as unknown as chokidar.FSWatcher
		);
		mockedFs.access.mockResolvedValue(undefined);
		mockedFs.mkdir.mockResolvedValue(undefined);
		mockedFs.cp.mockResolvedValue(undefined);
		const sourceDir = path.resolve(process.cwd(), '.generated/php');
		const targetDir = path.resolve(process.cwd(), 'inc');
		mockedFs.readdir.mockImplementation(async (dir: string) => {
			if (dir === sourceDir) {
				return [createDirent('index.php')];
			}
			if (dir === targetDir) {
				return [];
			}
			return [];
		});
		mockedFs.rm.mockResolvedValue(undefined);
	});

	afterEach(() => {
		jest.useRealTimers();
		jest.resetAllMocks();
	});

	it('performs initial generation and responds to fast changes', async () => {
		const reporter = createReporterMock();
		const { command, stdout } = createStartCommand({
			buildReporter: jest.fn().mockReturnValue(reporter),
		});
		const { watcher, executePromise } = await runCommand(command);

		expect(runGenerationMock).toHaveBeenCalledTimes(1);

		watcher.emit('all', 'change', 'kernel.config.ts');
		await flushTimers();
		expect(runGenerationMock).toHaveBeenCalledTimes(1);

		jest.advanceTimersByTime(FAST_DEBOUNCE_MS - 1);
		await flushTimers();
		expect(runGenerationMock).toHaveBeenCalledTimes(1);

		jest.advanceTimersByTime(1);
		await flushTimers();
		expect(runGenerationMock).toHaveBeenCalledTimes(2);

		await shutdown(executePromise);
		expect(stdout.toString()).toContain('summary');
	});

	it('uses slow debounce for schema changes and overrides fast triggers', async () => {
		const { command } = createStartCommand();
		const { watcher, executePromise } = await runCommand(command);

		watcher.emit('all', 'change', 'kernel.config.ts');
		watcher.emit('all', 'change', 'contracts/job.schema.json');

		jest.advanceTimersByTime(FAST_DEBOUNCE_MS);
		await flushTimers();
		expect(runGenerationMock).toHaveBeenCalledTimes(1);

		jest.advanceTimersByTime(SLOW_DEBOUNCE_MS);
		await flushTimers();
		expect(runGenerationMock).toHaveBeenCalledTimes(2);

		await shutdown(executePromise);
	});

	it('auto-applies PHP artifacts when enabled', async () => {
		stubRunGeneration({
			exitCode: WPK_EXIT_CODES.SUCCESS,
			summary: null,
			output: '',
		});

		const { command } = createStartCommand();
		command.autoApplyPhp = true;

		const { watcher, executePromise } = await runCommand(command);

		expect(mockedFs.mkdir).toHaveBeenCalled();
		await expectEventually(() => {
			expect(mockedFs.cp).toHaveBeenCalledTimes(1);
		});

		watcher.emit('all', 'change', 'kernel.config.ts');
		await jest.advanceTimersByTimeAsync(FAST_DEBOUNCE_MS + 1);
		await flushTimers();

		expect(runGenerationMock).toHaveBeenCalledTimes(2);
		await expectEventually(() => {
			expect(mockedFs.cp).toHaveBeenCalledTimes(2);
		});

		await shutdown(executePromise);
	});

	it('skips auto-apply when PHP artifacts are missing', async () => {
		mockedFs.access.mockRejectedValueOnce(new Error('missing output'));

		const { command } = createStartCommand();
		command.autoApplyPhp = true;

		const { executePromise } = await runCommand(command);

		expect(mockedFs.cp).not.toHaveBeenCalled();

		await shutdown(executePromise);
	});

	it('removes stale PHP artifacts before copying new ones', async () => {
		const sourceDir = path.resolve(process.cwd(), '.generated/php');
		const targetDir = path.resolve(process.cwd(), 'inc');

		mockedFs.readdir.mockImplementation(async (dir: string) => {
			if (dir === sourceDir) {
				return [createDirent('current.php')];
			}

			if (dir === targetDir) {
				return [createDirent('current.php'), createDirent('stale.php')];
			}

			return [];
		});

		const { command } = createStartCommand();
		command.autoApplyPhp = true;

		const { executePromise } = await runCommand(command);

		await expectEventually(() => {
			expect(mockedFs.rm).toHaveBeenCalledWith(
				path.join(targetDir, 'stale.php'),
				{ force: true }
			);
		});

		await shutdown(executePromise);
	});

	it('forwards Vite output at info and warn levels', async () => {
		const reporter = createReporterMock();
		const { command, viteProcess } = createStartCommand({
			buildReporter: jest.fn().mockReturnValue(reporter),
		});

		const { executePromise } = await runCommand(command);

		viteProcess.stdout.write('ready\n');
		viteProcess.stderr.write('error\n');
		await flushTimers();

		expect(reporter.info).toHaveBeenCalledWith('ready\n');
		expect(reporter.warn).toHaveBeenCalledWith('error\n');

		await shutdown(executePromise);
	});

	it('stops the Vite dev server on shutdown', async () => {
		const { command, viteProcess } = createStartCommand();
		const { executePromise } = await runCommand(command);

		await shutdown(executePromise);

		expect(viteProcess.kill).toHaveBeenCalledWith('SIGINT');
	});

	it('logs warnings when generation fails', async () => {
		const reporter = createReporterMock();
		runGenerationMock.mockImplementationOnce(async () => ({
			exitCode: WPK_EXIT_CODES.UNEXPECTED_ERROR,
			summary: null,
			output: null,
		}));

		const { command } = createStartCommand({
			buildReporter: jest.fn().mockReturnValue(reporter),
		});

		const { executePromise } = await runCommand(command);

		await shutdown(executePromise);

		expect(reporter.warn).toHaveBeenCalledWith(
			'Generation completed with errors.',
			{
				exitCode: WPK_EXIT_CODES.UNEXPECTED_ERROR,
			}
		);
	});
});

class FakeWatcher extends EventEmitter {
	close = jest.fn(async () => {
		this.emit('close');
	});
}

class FakeChildProcess
	extends EventEmitter
	implements ChildProcessWithoutNullStreams
{
	stdout = new PassThrough();
	stderr = new PassThrough();
	stdin = new PassThrough();
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

	pid = 1234;
	connected = true;
	exitCode: number | null = null;
	signalCode: NodeJS.Signals | null = null;
	spawnargs: string[] = [];
	spawnfile = '';
	channel = null;
	stdio = [this.stdin, this.stdout, this.stderr];
	send(): boolean {
		return false;
	}
	disconnect(): void {}
	ref(): this {
		return this;
	}
	unref(): this {
		return this;
	}
}

type ExecuteResult = ReturnType<
	ReturnType<typeof buildStartCommand>['prototype']['execute']
>;

async function runCommand(
	command: InstanceType<ReturnType<typeof buildStartCommand>>,
	watcher: FakeWatcher = new FakeWatcher()
): Promise<{
	watcher: FakeWatcher;
	executePromise: ExecuteResult;
}> {
	watchMock.mockReturnValue(watcher as unknown as chokidar.FSWatcher);
	const executePromise = command.execute();
	await flushTimers();
	return { watcher, executePromise };
}

async function shutdown(
	executePromise: ExecuteResult,
	signals: NodeJS.Signals[] = ['SIGINT']
): Promise<void> {
	for (const signal of signals) {
		process.emit(signal, signal);
		await flushTimers();
	}
	await executePromise;
}

function createStartCommand(options: BuildStartCommandOptions = {}): {
	command: InstanceType<ReturnType<typeof buildStartCommand>>;
	watcher: jest.MockedFunction<typeof watchMock>;
	stdout: PassThrough;
	viteProcess: FakeChildProcess;
} {
	const reporter = createReporterMock();
	const buildReporter =
		options.buildReporter ?? jest.fn().mockReturnValue(reporter);
	const StartCommand = buildStartCommand({ ...options, buildReporter });
	const command = new StartCommand();
	const context = assignCommandContext(command);
	const viteProcess = new FakeChildProcess();
	(
		command as unknown as { createViteDevProcess: () => FakeChildProcess }
	).createViteDevProcess = jest.fn(() => viteProcess);
	return {
		command,
		watcher: watchMock,
		stdout: context.stdout as PassThrough,
		viteProcess,
	};
}

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

async function expectEventually(assertion: () => void): Promise<void> {
	for (let attempt = 0; attempt < 10; attempt += 1) {
		try {
			assertion();
			return;
		} catch (error) {
			await jest.advanceTimersByTimeAsync(1);
			await flushTimers();
			if (attempt === 9) {
				throw error;
			}
		}
	}
}

const FAST_DEBOUNCE_MS = 200;
const SLOW_DEBOUNCE_MS = 600;

function createDirent(
	name: string,
	options: { directory?: boolean } = {}
): Dirent {
	return {
		name,
		isDirectory: () => Boolean(options.directory),
		isFile: () => !options.directory,
		isSymbolicLink: () => false,
	} as unknown as Dirent;
}

function stubRunGeneration(result: GenerationRunResult): void {
	runGenerationMock.mockImplementation(async (_dependencies, options) => {
		if (result.output) {
			options.stdout.write(result.output);
		}
		return result;
	});
}
