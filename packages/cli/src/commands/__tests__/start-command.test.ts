import { EventEmitter } from 'node:events';
import path from 'node:path';
import fs from 'node:fs/promises';
import { PassThrough } from 'node:stream';
import type { FSWatcher } from 'chokidar';
import {
	StartCommand,
	detectTier,
	prioritiseQueued,
	type Trigger,
} from '../start';
import { runGenerate } from '../run-generate';
import { EXIT_CODES } from '../run-generate/types';
import chokidar from 'chokidar';
import { assignCommandContext, flushAsync } from '@wpkernel/test-utils/cli';

const runGenerateMock = runGenerate as jest.MockedFunction<typeof runGenerate>;
const watchMock = chokidar.watch as jest.MockedFunction<typeof chokidar.watch>;
const mockedFs = fs as jest.Mocked<typeof fs>;

const flushTimers = () => flushAsync({ runAllTimers: true });

describe('StartCommand', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		runGenerateMock.mockResolvedValue({
			exitCode: EXIT_CODES.SUCCESS,
			output: '[summary]\n',
		});
		watchMock.mockImplementation(
			() => new FakeWatcher() as unknown as FSWatcher
		);
		mockedFs.access.mockResolvedValue(undefined);
		mockedFs.mkdir.mockResolvedValue(undefined);
		mockedFs.cp.mockResolvedValue(undefined);
	});

	afterEach(() => {
		jest.useRealTimers();
		jest.resetAllMocks();
	});

	it('performs initial generation and responds to fast changes', async () => {
		const { command, stdout } = createStartCommand();
		const { watcher, executePromise } = await runCommand(command);

		expect(runGenerateMock).toHaveBeenCalledTimes(1);

		watcher.emit('all', 'change', 'kernel.config.ts');
		await flushTimers();
		expect(runGenerateMock).toHaveBeenCalledTimes(1);

		jest.advanceTimersByTime(FAST_DEBOUNCE_MS - 1);
		await flushTimers();
		expect(runGenerateMock).toHaveBeenCalledTimes(1);

		jest.advanceTimersByTime(1);
		await flushTimers();
		expect(runGenerateMock).toHaveBeenCalledTimes(2);

		await shutdown(executePromise);

		expect(watcher.close).toHaveBeenCalledTimes(1);
		expect(stdout.toString()).toContain('[summary]');
	});

	it('uses slow debounce for schema changes and overrides fast triggers', async () => {
		const { command } = createStartCommand();
		const { watcher, executePromise } = await runCommand(command);

		watcher.emit('all', 'change', 'kernel.config.ts');
		watcher.emit(
			'all',
			'change',
			path.join('contracts', 'job.schema.json')
		);

		jest.advanceTimersByTime(FAST_DEBOUNCE_MS);
		await flushTimers();
		expect(runGenerateMock).toHaveBeenCalledTimes(1);

		jest.advanceTimersByTime(SLOW_DEBOUNCE_MS);
		await flushTimers();
		expect(runGenerateMock).toHaveBeenCalledTimes(2);

		await shutdown(executePromise);
	});

	it('handles watcher errors without crashing', async () => {
		const { command } = createStartCommand();
		const { watcher, executePromise } = await runCommand(command);

		watcher.emit('error', new Error('watcher failure'));

		watcher.emit('all', 'change', 'kernel.config.ts');
		await jest.advanceTimersByTimeAsync(FAST_DEBOUNCE_MS + 1);
		await flushTimers();

		expect(runGenerateMock).toHaveBeenCalledTimes(2);

		await shutdown(executePromise);
	});

	it('auto-applies PHP artifacts when enabled', async () => {
		runGenerateMock.mockResolvedValue({ exitCode: 0, output: '' });

		const { command } = createStartCommand();
		command.autoApplyPhp = true;

		const { watcher, executePromise } = await runCommand(command);

		expect(mockedFs.mkdir).toHaveBeenCalledTimes(1);
		await expectEventually(() => {
			expect(mockedFs.cp).toHaveBeenCalledTimes(1);
		});

		watcher.emit('all', 'change', 'kernel.config.ts');
		await jest.advanceTimersByTimeAsync(FAST_DEBOUNCE_MS + 1);
		await flushTimers();

		expect(runGenerateMock).toHaveBeenCalledTimes(2);
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

	it('queues additional changes while a run is in progress', async () => {
		let resolveFirstRun: (() => void) | undefined;
		runGenerateMock
			.mockImplementationOnce(
				() =>
					new Promise((resolve) => {
						resolveFirstRun = () =>
							resolve({ exitCode: 0, output: '' });
					})
			)
			.mockResolvedValue({ exitCode: 0, output: '' });

		const { command } = createStartCommand();
		const { watcher, executePromise } = await runCommand(command);
		expect(runGenerateMock).toHaveBeenCalledTimes(1);

		watcher.emit('all', 'change', 'kernel.config.ts');
		await jest.advanceTimersByTimeAsync(FAST_DEBOUNCE_MS + 1);
		await flushTimers();

		expect(runGenerateMock).toHaveBeenCalledTimes(1);

		resolveFirstRun?.();
		await flushTimers();
		await jest.advanceTimersByTimeAsync(FAST_DEBOUNCE_MS + 1);
		await flushTimers();

		expect(runGenerateMock).toHaveBeenCalledTimes(2);

		await shutdown(executePromise, ['SIGINT', 'SIGINT']);
	});

	it('clears pending timers when shutting down with queued triggers', async () => {
		const { command } = createStartCommand();
		const { watcher, executePromise } = await runCommand(command);

		watcher.emit('all', 'change', 'kernel.config.ts');
		await flushTimers();

		await shutdown(executePromise);

		expect(runGenerateMock).toHaveBeenCalledTimes(1);
	});

	it('restarts debounce timers when repeated fast events arrive', async () => {
		const { command } = createStartCommand();
		const { watcher, executePromise } = await runCommand(command);

		watcher.emit('all', 'change', 'kernel.config.ts');
		await flushTimers();

		watcher.emit('all', 'change', 'kernel.config.ts');
		await flushTimers();

		await jest.advanceTimersByTimeAsync(FAST_DEBOUNCE_MS - 1);
		await flushTimers();
		expect(runGenerateMock).toHaveBeenCalledTimes(1);

		await jest.advanceTimersByTimeAsync(1);
		await flushTimers();
		expect(runGenerateMock).toHaveBeenCalledTimes(2);

		await shutdown(executePromise);
	});

	it('only resolves shutdown once when multiple signals are received', async () => {
		const { command } = createStartCommand();
		const { watcher, executePromise } = await runCommand(command);

		await shutdown(executePromise, ['SIGINT', 'SIGTERM']);

		expect(runGenerateMock).toHaveBeenCalledTimes(1);
		expect(watcher.close).toHaveBeenCalledTimes(2);
	});

	it('passes verbose flag through to the generation pipeline', async () => {
		const { command } = createStartCommand();
		command.verbose = true;

		const { executePromise } = await runCommand(command);

		expect(runGenerateMock).toHaveBeenCalledWith(
			expect.objectContaining({ verbose: true })
		);

		await shutdown(executePromise);
	});

	it('warns when watcher close fails', async () => {
		const watcher = new FakeWatcher();
		watcher.close.mockRejectedValueOnce(new Error('close failure'));

		const { command } = createStartCommand();
		const { executePromise } = await runCommand(command, watcher);

		await shutdown(executePromise);

		expect(watcher.close).toHaveBeenCalledTimes(1);
	});

	it('skips auto-apply when generation fails', async () => {
		const watcher = new FakeWatcher();
		runGenerateMock
			.mockResolvedValueOnce({ exitCode: 1, output: '' })
			.mockResolvedValue({ exitCode: 0, output: '' });

		const { command } = createStartCommand();
		command.autoApplyPhp = true;

		const { executePromise } = await runCommand(command, watcher);
		expect(mockedFs.cp).toHaveBeenCalledTimes(0);

		watcher.emit('all', 'change', 'kernel.config.ts');
		await jest.advanceTimersByTimeAsync(FAST_DEBOUNCE_MS + 1);
		await flushTimers();

		expect(runGenerateMock).toHaveBeenCalledTimes(2);
		await expectEventually(() => {
			expect(mockedFs.cp).toHaveBeenCalledTimes(1);
		});

		await shutdown(executePromise);
	});

	it('warns when auto-apply copy fails', async () => {
		const watcher = new FakeWatcher();
		mockedFs.cp.mockRejectedValueOnce(new Error('copy failed'));
		runGenerateMock.mockResolvedValue({ exitCode: 0, output: '' });

		const { command } = createStartCommand();
		command.autoApplyPhp = true;

		const { executePromise } = await runCommand(command, watcher);

		expect(mockedFs.cp).toHaveBeenCalledTimes(1);

		watcher.emit('all', 'change', 'kernel.config.ts');
		await jest.advanceTimersByTimeAsync(FAST_DEBOUNCE_MS + 1);
		await flushTimers();

		expect(mockedFs.cp).toHaveBeenCalledTimes(2);

		await shutdown(executePromise);
	});

	it('logs generation errors when the pipeline rejects', async () => {
		const watcher = new FakeWatcher();
		runGenerateMock
			.mockImplementationOnce(() => Promise.reject(new Error('boom')))
			.mockResolvedValue({ exitCode: 0, output: '' });

		const { command } = createStartCommand();
		const { executePromise } = await runCommand(command, watcher);
		watcher.emit('all', 'change', 'kernel.config.ts');
		await jest.advanceTimersByTimeAsync(FAST_DEBOUNCE_MS + 1);
		await flushTimers();

		expect(runGenerateMock).toHaveBeenCalledTimes(2);

		await shutdown(executePromise);
	});

	it('stops the Vite dev server on shutdown', async () => {
		const { command, viteProcess } = createStartCommand();
		const { executePromise } = await runCommand(command);

		await shutdown(executePromise);

		expect(viteProcess.kill).toHaveBeenCalledWith('SIGINT');
	});

	it('returns error exit code when Vite fails to launch', async () => {
		const command = new StartCommand();
		assignCommandContext(command);

		jest.spyOn(
			command as unknown as StartCommand,
			'createViteDevProcess'
		).mockImplementation(() => {
			throw new Error('spawn failure');
		});

		const exitCode = await command.execute();

		expect(exitCode).toBe(EXIT_CODES.UNEXPECTED_ERROR);
		expect(watchMock).not.toHaveBeenCalled();
	});

	it('detects slow tiers for contract and schema paths', () => {
		expect(detectTier('contracts/item.schema.json')).toBe('slow');
		expect(detectTier('schemas/foo.json')).toBe('slow');
		expect(
			detectTier(path.resolve(process.cwd(), 'schemas/absolute.json'))
		).toBe('slow');
		expect(detectTier('src/resources/post.ts')).toBe('fast');
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
});

class FakeWatcher extends EventEmitter {
	close = jest.fn(async () => {
		this.emit('close');
	});
}

class FakeChildProcess extends EventEmitter {
	stdout = new PassThrough();
	stderr = new PassThrough();
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

	killed = false;
}

type ExecuteResult = ReturnType<StartCommand['execute']>;

async function runCommand<T extends { execute: StartCommand['execute'] }>(
	command: T,
	watcher: FakeWatcher = new FakeWatcher()
): Promise<{
	watcher: FakeWatcher;
	executePromise: ExecuteResult;
}> {
	watchMock.mockReturnValue(watcher as unknown as FSWatcher);
	const executePromise = command.execute();
	await flushTimers();
	return { watcher, executePromise };
}

async function shutdown(
	executePromise: ExecuteResult,
	signals: NodeJS.Signals[] = ['SIGINT']
): Promise<void> {
	for (const signal of signals) {
		process.emit(signal);
	}
	await flushTimers();
	await executePromise;
}

function createStartCommand(): {
	command: StartCommand;
	viteProcess: FakeChildProcess;
	stdout: ReturnType<typeof assignCommandContext>['stdout'];
	stderr: ReturnType<typeof assignCommandContext>['stderr'];
} {
	const command = new StartCommand();
	const { stdout, stderr } = assignCommandContext(command);

	const viteProcess = new FakeChildProcess();
	jest.spyOn(
		command as unknown as StartCommand,
		'createViteDevProcess'
	).mockReturnValue(
		viteProcess as unknown as ReturnType<
			StartCommand['createViteDevProcess']
		>
	);

	return { command, viteProcess, stdout, stderr };
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

const FAST_DEBOUNCE_MS = 200;
const SLOW_DEBOUNCE_MS = 600;

jest.mock('chokidar', () => ({
	watch: jest.fn(),
}));

jest.mock('../run-generate', () => ({
	runGenerate: jest.fn(),
	serialiseError: (error: unknown) => ({
		message: error instanceof Error ? error.message : String(error),
	}),
}));

jest.mock('node:fs/promises', () => ({
	access: jest.fn(),
	mkdir: jest.fn(),
	cp: jest.fn(),
}));
