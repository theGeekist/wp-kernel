import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
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

	const completion = once(child, 'exit');

	return completion.then(([code]) => {
		const completedAt = new Date();
		return {
			command: context.command,
			args: context.args,
			cwd: context.cwd,
			startedAt: context.startedAt.toISOString(),
			completedAt: completedAt.toISOString(),
			durationMs: completedAt.getTime() - context.startedAt.getTime(),
			exitCode: code ?? -1,
			stdout: Buffer.concat(stdoutChunks).toString('utf8'),
			stderr: Buffer.concat(stderrChunks).toString('utf8'),
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
