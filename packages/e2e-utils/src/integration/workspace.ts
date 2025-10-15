import path from 'node:path';
import os from 'node:os';
import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import {
	type CliTranscript,
	type IsolatedWorkspace,
	type WorkspaceRunOptions,
	type WorkspaceTools,
} from './types.js';

interface CreateWorkspaceOptions {
	prefix?: string;
	env?: NodeJS.ProcessEnv;
	timezone?: string;
	locale?: string;
	tools?: Partial<WorkspaceTools>;
}

const DEFAULT_TOOLS: WorkspaceTools = {
	node: process.execPath,
	pnpm: 'pnpm',
};

export async function createIsolatedWorkspace(
	options: CreateWorkspaceOptions = {}
): Promise<IsolatedWorkspace> {
	const tempRoot = await fs.mkdtemp(
		path.join(os.tmpdir(), options.prefix ?? 'wpk-e2e-')
	);
	const root = path.join(tempRoot, randomUUID());
	await fs.mkdir(root, { recursive: true });

	const baseEnv: NodeJS.ProcessEnv = {
		...process.env,
		...options.env,
	};

	if (options.timezone) {
		baseEnv.TZ = options.timezone;
	}

	if (options.locale) {
		baseEnv.LANG = options.locale;
	}

	const tools: WorkspaceTools = {
		node: options.tools?.node ?? DEFAULT_TOOLS.node,
		pnpm: options.tools?.pnpm ?? DEFAULT_TOOLS.pnpm,
	};

	const run = async (
		command: string,
		args: string[] = [],
		runOptions: WorkspaceRunOptions = {}
	): Promise<CliTranscript> => {
		const cwd = resolveWorkspaceCwd(root, runOptions.cwd);
		const env = composeWorkspaceEnv(baseEnv, runOptions.env);

		const startedAt = new Date();
		const child = spawn(command, args, {
			cwd,
			env,
			stdio: ['pipe', 'pipe', 'pipe'],
		});

		applyTimeout(child, runOptions.timeoutMs);
		writeToStdin(child, runOptions.stdin);

		const stdoutChunks: Buffer[] = [];
		const stderrChunks: Buffer[] = [];

		child.stdout?.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
		child.stderr?.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

		const outcome = await waitForChildCompletion(child);

		const completedAt = new Date();
		const stdout = Buffer.concat(stdoutChunks).toString('utf8');
		const stderr = buildStderr(command, args, outcome, stderrChunks);

		return {
			command,
			args,
			cwd,
			startedAt: startedAt.toISOString(),
			completedAt: completedAt.toISOString(),
			durationMs: completedAt.getTime() - startedAt.getTime(),
			exitCode: outcome.type === 'exit' ? (outcome.code ?? -1) : -1,
			stdout,
			stderr,
			env: normaliseEnv(env),
		};
	};

	return {
		root,
		env: baseEnv,
		tools,
		run,
		async dispose() {
			await fs.rm(tempRoot, { recursive: true, force: true });
		},
	};
}

function normaliseEnv(
	env: NodeJS.ProcessEnv
): Record<string, string | undefined> {
	const entries = Object.entries(env);
	entries.sort(([a], [b]) => a.localeCompare(b));
	return Object.fromEntries(entries);
}

function resolveWorkspaceCwd(root: string, override?: string): string {
	if (!override) {
		return root;
	}

	if (path.isAbsolute(override)) {
		return path.resolve(override);
	}

	return path.resolve(root, override);
}

function composeWorkspaceEnv(
	baseEnv: NodeJS.ProcessEnv,
	overrides?: NodeJS.ProcessEnv
): NodeJS.ProcessEnv {
	return {
		...baseEnv,
		...overrides,
	};
}

function applyTimeout(child: ChildProcess, timeoutMs?: number | null): void {
	if (!timeoutMs || timeoutMs <= 0) {
		return;
	}

	const timeout = setTimeout(() => {
		child.kill('SIGTERM');
	}, timeoutMs);

	if (typeof timeout === 'object') {
		(timeout as NodeJS.Timeout).unref?.();
	}
}

function writeToStdin(child: ChildProcess, stdin?: string): void {
	if (!stdin) {
		return;
	}

	child.stdin?.write(stdin);
	child.stdin?.end();
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
	command: string,
	args: string[],
	outcome: ProcessOutcome,
	stderrChunks: Buffer[]
): string {
	const stderr = Buffer.concat(stderrChunks).toString('utf8');

	if (outcome.type !== 'error') {
		return stderr;
	}

	const failureMessage = formatSpawnError(command, args, outcome.error);

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
