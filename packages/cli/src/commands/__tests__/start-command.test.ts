import { EventEmitter } from 'node:events';
import path from 'node:path';
import fs from 'node:fs/promises';
import { PassThrough, Writable } from 'node:stream';
import type { FSWatcher } from 'chokidar';
import {
	StartCommand,
	detectTier,
	prioritiseQueued,
	type Trigger,
} from '../start';
import { DevCommand } from '../dev';
import { runGenerate } from '../run-generate';
import chokidar from 'chokidar';

const runGenerateMock = runGenerate as jest.MockedFunction<typeof runGenerate>;
const watchMock = chokidar.watch as jest.MockedFunction<typeof chokidar.watch>;
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('StartCommand', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		runGenerateMock.mockResolvedValue({
			exitCode: 0,
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
		const watcher = new FakeWatcher() as unknown as FSWatcher;
		watchMock.mockReturnValue(watcher);

		const { command } = createStartCommand();
		const executePromise = command.execute();

		await flushAsync();
		expect(runGenerateMock).toHaveBeenCalledTimes(1);

		watcher.emit('all', 'change', 'kernel.config.ts');
		await flushAsync();
		expect(runGenerateMock).toHaveBeenCalledTimes(1);

		jest.advanceTimersByTime(FAST_DEBOUNCE_MS - 1);
		await flushAsync();
		expect(runGenerateMock).toHaveBeenCalledTimes(1);

		jest.advanceTimersByTime(1);
		await flushAsync();
		expect(runGenerateMock).toHaveBeenCalledTimes(2);

		process.emit('SIGINT');
		await flushAsync();
		await executePromise;

		expect(watcher.close).toHaveBeenCalledTimes(1);
		const stdout = (command.context.stdout as MemoryStream).toString();
		expect(stdout).toContain('[summary]');
	});

	it('uses slow debounce for schema changes and overrides fast triggers', async () => {
		const watcher = new FakeWatcher() as unknown as FSWatcher;
		watchMock.mockReturnValue(watcher);

		const { command } = createStartCommand();
		const executePromise = command.execute();

		await flushAsync();
		expect(runGenerateMock).toHaveBeenCalledTimes(1);

		watcher.emit('all', 'change', 'kernel.config.ts');
		watcher.emit(
			'all',
			'change',
			path.join('contracts', 'job.schema.json')
		);

		jest.advanceTimersByTime(FAST_DEBOUNCE_MS);
		await flushAsync();
		expect(runGenerateMock).toHaveBeenCalledTimes(1);

		jest.advanceTimersByTime(SLOW_DEBOUNCE_MS);
		await flushAsync();
		expect(runGenerateMock).toHaveBeenCalledTimes(2);

		process.emit('SIGINT');
		await flushAsync();
		await executePromise;
	});

	it('handles watcher errors without crashing', async () => {
		const watcher = new FakeWatcher() as unknown as FSWatcher;
		watchMock.mockReturnValue(watcher);

		const { command } = createStartCommand();
		const executePromise = command.execute();

		await flushAsync();
		watcher.emit('error', new Error('watcher failure'));

		watcher.emit('all', 'change', 'kernel.config.ts');
		await jest.advanceTimersByTimeAsync(FAST_DEBOUNCE_MS + 1);
		await flushAsync();

		expect(runGenerateMock).toHaveBeenCalledTimes(2);

		process.emit('SIGINT');
		await flushAsync();
		await executePromise;
	});

	it('auto-applies PHP artifacts when enabled', async () => {
		const watcher = new FakeWatcher() as unknown as FSWatcher;
		watchMock.mockReturnValue(watcher);
		runGenerateMock.mockResolvedValue({ exitCode: 0, output: '' });

		const { command } = createStartCommand();
		command.autoApplyPhp = true;

		const executePromise = command.execute();

		await flushAsync();
		expect(mockedFs.mkdir).toHaveBeenCalledTimes(1);
		await expectEventually(() => {
			expect(mockedFs.cp).toHaveBeenCalledTimes(1);
		});

		watcher.emit('all', 'change', 'kernel.config.ts');
		await jest.advanceTimersByTimeAsync(FAST_DEBOUNCE_MS + 1);
		await flushAsync();

		expect(runGenerateMock).toHaveBeenCalledTimes(2);
		await expectEventually(() => {
			expect(mockedFs.cp).toHaveBeenCalledTimes(2);
		});

		process.emit('SIGINT');
		await flushAsync();
		await executePromise;
	});

	it('skips auto-apply when PHP artifacts are missing', async () => {
		const watcher = new FakeWatcher() as unknown as FSWatcher;
		watchMock.mockReturnValue(watcher);
		mockedFs.access.mockRejectedValueOnce(new Error('missing output'));

		const { command } = createStartCommand();
		command.autoApplyPhp = true;

		const executePromise = command.execute();

		await flushAsync();

		expect(mockedFs.cp).not.toHaveBeenCalled();

		process.emit('SIGINT');
		await flushAsync();
		await executePromise;
	});

	it('queues additional changes while a run is in progress', async () => {
		const watcher = new FakeWatcher() as unknown as FSWatcher;
		watchMock.mockReturnValue(watcher);

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
		const executePromise = command.execute();

		await flushAsync();
		expect(runGenerateMock).toHaveBeenCalledTimes(1);

		watcher.emit('all', 'change', 'kernel.config.ts');
		await jest.advanceTimersByTimeAsync(FAST_DEBOUNCE_MS + 1);
		await flushAsync();

		expect(runGenerateMock).toHaveBeenCalledTimes(1);

		resolveFirstRun?.();
		await flushAsync();
		await jest.advanceTimersByTimeAsync(FAST_DEBOUNCE_MS + 1);
		await flushAsync();

		expect(runGenerateMock).toHaveBeenCalledTimes(2);

		process.emit('SIGINT');
		process.emit('SIGINT');
		await flushAsync();
		await executePromise;
	});

	it('clears pending timers when shutting down with queued triggers', async () => {
		const watcher = new FakeWatcher() as unknown as FSWatcher;
		watchMock.mockReturnValue(watcher);

		const { command } = createStartCommand();
		const executePromise = command.execute();

		await flushAsync();
		watcher.emit('all', 'change', 'kernel.config.ts');
		await flushAsync();

		process.emit('SIGINT');
		await flushAsync();
		await executePromise;

		expect(runGenerateMock).toHaveBeenCalledTimes(1);
	});

	it('restarts debounce timers when repeated fast events arrive', async () => {
		const watcher = new FakeWatcher() as unknown as FSWatcher;
		watchMock.mockReturnValue(watcher);

		const { command } = createStartCommand();
		const executePromise = command.execute();

		await flushAsync();
		watcher.emit('all', 'change', 'kernel.config.ts');
		await flushAsync();

		watcher.emit('all', 'change', 'kernel.config.ts');
		await flushAsync();

		await jest.advanceTimersByTimeAsync(FAST_DEBOUNCE_MS - 1);
		await flushAsync();
		expect(runGenerateMock).toHaveBeenCalledTimes(1);

		await jest.advanceTimersByTimeAsync(1);
		await flushAsync();
		expect(runGenerateMock).toHaveBeenCalledTimes(2);

		process.emit('SIGINT');
		await flushAsync();
		await executePromise;
	});

	it('only resolves shutdown once when multiple signals are received', async () => {
		const watcher = new FakeWatcher() as unknown as FSWatcher;
		watchMock.mockReturnValue(watcher);

		const { command } = createStartCommand();
		const executePromise = command.execute();

		await flushAsync();
		process.emit('SIGINT');
		process.emit('SIGTERM');

		await flushAsync();
		await executePromise;

		expect(runGenerateMock).toHaveBeenCalledTimes(1);
		expect(watcher.close).toHaveBeenCalledTimes(2);
	});

	it('passes verbose flag through to the generation pipeline', async () => {
		const watcher = new FakeWatcher() as unknown as FSWatcher;
		watchMock.mockReturnValue(watcher);

		const { command } = createStartCommand();
		command.verbose = true;

		const executePromise = command.execute();

		await flushAsync();

		expect(runGenerateMock).toHaveBeenCalledWith(
			expect.objectContaining({ verbose: true })
		);

		process.emit('SIGINT');
		await flushAsync();
		await executePromise;
	});

	it('warns when watcher close fails', async () => {
		const watcher = new FakeWatcher() as unknown as FSWatcher;
		(watcher as unknown as FakeWatcher).close.mockRejectedValueOnce(
			new Error('close failure')
		);
		watchMock.mockReturnValue(watcher);

		const { command } = createStartCommand();
		const executePromise = command.execute();

		await flushAsync();
		process.emit('SIGINT');
		await flushAsync();
		await executePromise;

		expect(watcher.close).toHaveBeenCalledTimes(1);
	});

	it('skips auto-apply when generation fails', async () => {
		const watcher = new FakeWatcher() as unknown as FSWatcher;
		watchMock.mockReturnValue(watcher);
		runGenerateMock
			.mockResolvedValueOnce({ exitCode: 1, output: '' })
			.mockResolvedValue({ exitCode: 0, output: '' });

		const { command } = createStartCommand();
		command.autoApplyPhp = true;

		const executePromise = command.execute();

		await flushAsync();
		expect(mockedFs.cp).toHaveBeenCalledTimes(0);

		watcher.emit('all', 'change', 'kernel.config.ts');
		await jest.advanceTimersByTimeAsync(FAST_DEBOUNCE_MS + 1);
		await flushAsync();

		expect(runGenerateMock).toHaveBeenCalledTimes(2);
		await expectEventually(() => {
			expect(mockedFs.cp).toHaveBeenCalledTimes(1);
		});

		process.emit('SIGINT');
		await flushAsync();
		await executePromise;
	});

	it('warns when auto-apply copy fails', async () => {
		const watcher = new FakeWatcher() as unknown as FSWatcher;
		watchMock.mockReturnValue(watcher);
		mockedFs.cp.mockRejectedValueOnce(new Error('copy failed'));
		runGenerateMock.mockResolvedValue({ exitCode: 0, output: '' });

		const { command } = createStartCommand();
		command.autoApplyPhp = true;

		const executePromise = command.execute();

		await flushAsync();
		expect(mockedFs.cp).toHaveBeenCalledTimes(1);

		watcher.emit('all', 'change', 'kernel.config.ts');
		await jest.advanceTimersByTimeAsync(FAST_DEBOUNCE_MS + 1);
		await flushAsync();

		expect(mockedFs.cp).toHaveBeenCalledTimes(2);

		process.emit('SIGINT');
		await flushAsync();
		await executePromise;
	});

	it('logs generation errors when the pipeline rejects', async () => {
		const watcher = new FakeWatcher() as unknown as FSWatcher;
		watchMock.mockReturnValue(watcher);
		runGenerateMock
			.mockImplementationOnce(() => Promise.reject(new Error('boom')))
			.mockResolvedValue({ exitCode: 0, output: '' });

		const { command } = createStartCommand();
		const executePromise = command.execute();

		await flushAsync();
		watcher.emit('all', 'change', 'kernel.config.ts');
		await jest.advanceTimersByTimeAsync(FAST_DEBOUNCE_MS + 1);
		await flushAsync();

		expect(runGenerateMock).toHaveBeenCalledTimes(2);

		process.emit('SIGINT');
		await flushAsync();
		await executePromise;
	});

	it('stops the Vite dev server on shutdown', async () => {
		const watcher = new FakeWatcher() as unknown as FSWatcher;
		watchMock.mockReturnValue(watcher);

		const { command, viteProcess } = createStartCommand();
		const executePromise = command.execute();

		await flushAsync();
		process.emit('SIGINT');
		await flushAsync();
		await executePromise;

		expect(viteProcess.kill).toHaveBeenCalledWith('SIGINT');
	});

	it('returns error exit code when Vite fails to launch', async () => {
		const command = new StartCommand();
		const stdout = new MemoryStream();
		const stderr = new MemoryStream();
		command.context = {
			stdout,
			stderr,
			stdin: process.stdin,
			env: process.env,
			cwd: () => process.cwd(),
			colorDepth: 1,
		} as StartCommand['context'];

		jest.spyOn(
			command as unknown as StartCommand,
			'createViteDevProcess'
		).mockImplementation(() => {
			throw new Error('spawn failure');
		});

		const exitCode = await command.execute();

		expect(exitCode).toBe(1);
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

describe('DevCommand alias', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		watchMock.mockImplementation(
			() => new FakeWatcher() as unknown as FSWatcher
		);
		runGenerateMock.mockResolvedValue({ exitCode: 0, output: '' });
	});

	afterEach(() => {
		jest.useRealTimers();
		jest.resetAllMocks();
	});

	it('emits a deprecation warning and delegates to StartCommand', async () => {
		const { command } = createDevCommand();
		const executePromise = command.execute();

		await flushAsync();

		const stderr = command.context.stderr as MemoryStream;
		expect(stderr.toString()).toContain('deprecated');

		process.emit('SIGINT');
		await flushAsync();
		await executePromise;
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

function createStartCommand(): {
	command: StartCommand;
	viteProcess: FakeChildProcess;
} {
	const command = new StartCommand();
	const stdout = new MemoryStream();
	const stderr = new MemoryStream();

	command.context = {
		stdout,
		stderr,
		stdin: process.stdin,
		env: process.env,
		cwd: () => process.cwd(),
		colorDepth: 1,
	} as StartCommand['context'];

	const viteProcess = new FakeChildProcess();
	jest.spyOn(
		command as unknown as StartCommand,
		'createViteDevProcess'
	).mockReturnValue(
		viteProcess as unknown as ReturnType<
			StartCommand['createViteDevProcess']
		>
	);

	return { command, viteProcess };
}

function createDevCommand(): {
	command: DevCommand;
	viteProcess: FakeChildProcess;
} {
	const command = new DevCommand();
	const stdout = new MemoryStream();
	const stderr = new MemoryStream();

	command.context = {
		stdout,
		stderr,
		stdin: process.stdin,
		env: process.env,
		cwd: () => process.cwd(),
		colorDepth: 1,
	} as DevCommand['context'];

	const viteProcess = new FakeChildProcess();
	jest.spyOn(
		command as unknown as DevCommand,
		'createViteDevProcess'
	).mockReturnValue(
		viteProcess as unknown as ReturnType<
			StartCommand['createViteDevProcess']
		>
	);

	return { command, viteProcess };
}

class MemoryStream extends Writable {
	private readonly chunks: string[] = [];

	override _write(
		chunk: string | Buffer,
		_encoding: BufferEncoding,
		callback: (error?: Error | null) => void
	): void {
		this.chunks.push(chunk.toString());
		callback();
	}

	override toString(): string {
		return this.chunks.join('');
	}
}

async function flushAsync(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
	await jest.advanceTimersByTimeAsync(0);
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
			await flushAsync();
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
