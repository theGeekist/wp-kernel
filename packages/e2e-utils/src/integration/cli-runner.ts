import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import type {
	CliCommand,
	CliCommandOptions,
	CliRunner,
	CliTranscript,
	SpawnedProcessHandles,
} from './types.js';

export function createCliRunner(baseEnv: NodeJS.ProcessEnv = {}): CliRunner {
	return {
		async run(
			command: CliCommand,
			options: CliCommandOptions = {}
		): Promise<CliTranscript> {
			const cwd = options.cwd ? path.resolve(options.cwd) : process.cwd();
			const env = buildEnv(baseEnv, options.env);

			const startedAt = new Date();
			const child = spawn(command.command, command.args ?? [], {
				cwd,
				env,
				stdio: ['pipe', 'pipe', 'pipe'],
			});

			applyTimeout(child, options.timeoutMs);
			writeToStdin(child, options.stdin);

			const transcript = captureTranscript(child, {
				command: command.command,
				args: command.args ?? [],
				cwd,
				startedAt,
				env,
			});

			return transcript;
		},
	};
}

export function captureTranscript(
	child: SpawnedProcessHandles['process'],
	context: {
		command: string;
		args: string[];
		cwd: string;
		startedAt: Date;
		env: NodeJS.ProcessEnv;
	}
): Promise<CliTranscript> {
	const stdoutChunks: Buffer[] = [];
	const stderrChunks: Buffer[] = [];

	child.stdout?.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
	child.stderr?.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

	return waitForChildCompletion(child).then((outcome) => {
		const completedAt = new Date();
		const stdout = Buffer.concat(stdoutChunks).toString('utf8');
		const stderr = buildStderr(context, outcome, stderrChunks);

		return {
			command: context.command,
			args: context.args,
			cwd: context.cwd,
			startedAt: context.startedAt.toISOString(),
			completedAt: completedAt.toISOString(),
			durationMs: completedAt.getTime() - context.startedAt.getTime(),
			exitCode: outcome.type === 'exit' ? (outcome.code ?? -1) : -1,
			stdout,
			stderr,
			env: normaliseEnv(context.env),
		} satisfies CliTranscript;
	});
}

function buildEnv(
	baseEnv: NodeJS.ProcessEnv,
	overrides?: NodeJS.ProcessEnv
): NodeJS.ProcessEnv {
	return {
		...process.env,
		...baseEnv,
		...overrides,
	};
}

function applyTimeout(child: ChildProcess, timeoutMs?: number | null): void {
	if (!timeoutMs || timeoutMs <= 0) {
		return;
	}

	const timeoutHandle = setTimeout(() => {
		child.kill('SIGTERM');
	}, timeoutMs);

	if (typeof timeoutHandle === 'object') {
		(timeoutHandle as NodeJS.Timeout).unref?.();
	}
}

function writeToStdin(child: ChildProcess, stdin?: string): void {
	if (!stdin) {
		return;
	}

	child.stdin?.write(stdin);
	child.stdin?.end();
}

function normaliseEnv(
	env: NodeJS.ProcessEnv
): Record<string, string | undefined> {
	const entries = Object.entries(env);
	entries.sort(([a], [b]) => a.localeCompare(b));
	return Object.fromEntries(entries);
}

type ProcessOutcome =
	| { type: 'exit'; code: number | null; signal: NodeJS.Signals | null }
	| { type: 'error'; error: NodeJS.ErrnoException };

function waitForChildCompletion(child: ChildProcess): Promise<ProcessOutcome> {
	return new Promise<ProcessOutcome>((resolve) => {
		const handleExit = (
			code: number | null,
			signal: NodeJS.Signals | null
		) => {
			cleanup();
			resolve({ type: 'exit', code, signal });
		};

		const handleError = (error: NodeJS.ErrnoException) => {
			cleanup();
			resolve({ type: 'error', error });
		};

		const cleanup = () => {
			child.removeListener('exit', handleExit);
			child.removeListener('error', handleError);
		};

		child.once('exit', handleExit);
		child.once('error', handleError);
	});
}

function buildStderr(
	context: {
		command: string;
		args: string[];
	},
	outcome: ProcessOutcome,
	stderrChunks: Buffer[]
): string {
	const stderr = Buffer.concat(stderrChunks).toString('utf8');

	if (outcome.type !== 'error') {
		return stderr;
	}

	const failureMessage = formatSpawnError(
		context.command,
		context.args,
		outcome.error
	);

	return stderr ? `${stderr}\n${failureMessage}` : failureMessage;
}

function formatSpawnError(
	command: string,
	args: string[],
	error: NodeJS.ErrnoException
): string {
	const fullCommand = [command, ...args].join(' ').trim();
	const details = error.code
		? `${error.code}: ${error.message}`
		: error.message;
	return `Failed to spawn command "${fullCommand}"${details ? ` - ${details}` : ''}`;
}
