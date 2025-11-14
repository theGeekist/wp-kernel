import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import type { FSWatcher } from 'chokidar';
import { Command } from 'clipanion';
import { WPK_EXIT_CODES } from '@wpkernel/core/contracts';
import {
	assignCommandContext,
	createCommandReporterHarness,
	flushAsync,
	type CommandReporterHarness,
	type ReporterMock,
} from '@wpkernel/test-utils/cli';
import { buildStartCommand } from '../start';

export const FAST_DEBOUNCE_MS = 200;
export const SLOW_DEBOUNCE_MS = 600;

export const fsAccess = jest.fn<Promise<void>, [string]>();
export const fsMkdir = jest.fn<
	Promise<void>,
	[string, { recursive: boolean }]
>();
export const fsCp = jest.fn<
	Promise<void>,
	[string, string, { recursive: boolean }]
>();

export type WatchOptions = {
	readonly cwd: string;
	readonly ignoreInitial: boolean;
	readonly ignored: readonly string[];
};

export type WatchFactory = (
	patterns: readonly string[],
	options: WatchOptions
) => FSWatcher;

export const loadWatch = jest.fn<Promise<WatchFactory>, []>();
export const watchFactory = jest.fn<FSWatcher, [string[], WatchOptions]>();
export const spawnViteProcess = jest.fn<FakeChildProcess, []>();

export const reporterHarness = createCommandReporterHarness();
export const reporterFactory = reporterHarness.factory;

export interface StartCommandTestContext {
	readonly command: InstanceType<ReturnType<typeof buildStartCommand>>;
	readonly watcher: FakeWatcher;
	readonly stdout: PassThrough;
	readonly reporterHarness: CommandReporterHarness;
	readonly shutdown: (
		signals?: NodeJS.Signals | readonly NodeJS.Signals[]
	) => Promise<void>;
}

export function setupStartCommandTest(): void {
	jest.useFakeTimers();
	fsAccess.mockResolvedValue(undefined);
	fsMkdir.mockResolvedValue(undefined);
	fsCp.mockResolvedValue(undefined);
	loadWatch.mockResolvedValue(watchFactory);
	watchFactory.mockImplementation(
		() => new FakeWatcher() as unknown as FSWatcher
	);
	spawnViteProcess.mockImplementation(() => new FakeChildProcess());
	reporterHarness.reset();
	FakeGenerateCommand.executeMock.mockResolvedValue(WPK_EXIT_CODES.SUCCESS);
}

export function teardownStartCommandTest(): void {
	jest.useRealTimers();
	jest.clearAllMocks();
}

export async function withStartCommand(
	run: (context: StartCommandTestContext) => Promise<void> | void,
	options: StartCommandOptions = {}
): Promise<void> {
	const { command, watcher, stdout, executePromise } =
		await buildCommand(options);
	let hasShutdown = false;

	const shutdown = async (
		signals?: NodeJS.Signals | readonly NodeJS.Signals[]
	): Promise<void> => {
		if (hasShutdown) {
			return;
		}
		hasShutdown = true;
		await shutdownCommand(executePromise, signals);
	};

	try {
		await run({
			command,
			watcher,
			stdout,
			reporterHarness,
			shutdown,
		});
	} finally {
		await shutdown();
	}
}

export function createStartCommandInstance(
	overrides: Partial<StartCommandDependencies> = {}
) {
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
		...overrides,
	});

	const command = new StartCommand();
	assignCommandContext(command);
	return command;
}

export async function emitChange(
	watcher: FakeWatcher,
	file: string,
	event: 'add' | 'change' = 'change'
): Promise<void> {
	watcher.emit('all', event, file);
	await flushAsync({ runAllTimers: true });
}

export async function advanceBy(milliseconds: number): Promise<void> {
	await jest.advanceTimersByTimeAsync(milliseconds);
	await flushAsync({ runAllTimers: true });
}

export const advanceFastDebounce = (offset = 0): Promise<void> =>
	advanceBy(FAST_DEBOUNCE_MS + offset);

export const advanceSlowDebounce = (offset = 0): Promise<void> =>
	advanceBy(SLOW_DEBOUNCE_MS + offset);

export async function expectEventually(assertion: () => void): Promise<void> {
	for (let attempt = 0; attempt < 5; attempt += 1) {
		try {
			assertion();
			return;
		} catch (error) {
			if (attempt === 4) {
				throw error;
			}
			await flushAsync({ runAllTimers: true });
		}
	}
}

export function getReporterChild(
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

type StartCommandOptions = {
	readonly autoApply?: boolean;
	readonly beforeInstantiate?: (
		StartCommand: ReturnType<typeof buildStartCommand>
	) => void;
} & Partial<StartCommandDependencies>;

type StartCommandDependencies = Parameters<typeof buildStartCommand>[0];

type GenerateConstructor = new () => Command;

export class FakeGenerateCommand extends Command {
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

export class FakeWatcher extends EventEmitter {
	close = jest.fn(async () => {
		this.emit('close');
	});
}

export class FakeChildProcess extends EventEmitter {
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

async function buildCommand({
	autoApply = false,
	beforeInstantiate,
	...overrides
}: StartCommandOptions = {}) {
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
		...overrides,
	});

	beforeInstantiate?.(StartCommand);

	const command = new StartCommand();
	command.autoApply = autoApply;
	const { stdout } = assignCommandContext(command);

	const executePromise = command.execute();
	await flushAsync({ runAllTimers: true });

	const watcher = watchFactory.mock.results[0]
		?.value as unknown as FakeWatcher;
	if (!watcher) {
		throw new Error('Expected watcher to be created');
	}

	return { command, watcher, stdout, executePromise };
}

async function shutdownCommand(
	executePromise: Promise<number>,
	signals?: NodeJS.Signals | readonly NodeJS.Signals[]
): Promise<void> {
	let normalized: readonly NodeJS.Signals[];
	if (signals) {
		normalized = Array.isArray(signals) ? signals : [signals];
	} else {
		normalized = ['SIGINT'];
	}

	for (const signal of normalized) {
		process.emit(signal);
	}
	await flushAsync({ runAllTimers: true });
	await executePromise;
}
