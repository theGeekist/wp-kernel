import { spawn, type SpawnOptions } from 'node:child_process';

export interface RunProcessOptions {
	cwd?: SpawnOptions['cwd'];
	env?: SpawnOptions['env'];
	stdio?: SpawnOptions['stdio'];
	input?: string | Buffer;
	signal?: SpawnOptions['signal'];
}

export interface RunProcessResult {
	code: number;
	stdout: string;
	stderr: string;
	signal: NodeJS.Signals | null;
}

function prepareNodeOptionSegment(
	value: string | undefined
): string | undefined {
	if (typeof value !== 'string') {
		return undefined;
	}

	const trimmed = value.trim();
	if (trimmed.length === 0) {
		return undefined;
	}

	return trimmed.replace(/\s+/gu, ' ');
}

export interface BuildNodeOptionsConfig {
	base?: string | undefined;
	loader?: string | undefined;
	noWarnings?: boolean;
	extras?: readonly string[];
}

export function buildNodeOptions(
	config: BuildNodeOptionsConfig
): string | undefined {
	const { base, loader, noWarnings = false, extras = [] } = config;

	const normalizedBase = prepareNodeOptionSegment(base);
	const normalizedLoader = prepareNodeOptionSegment(
		typeof loader === 'string' ? `--loader ${loader}` : undefined
	);

	const normalizedExtras = extras
		.map((extra) => prepareNodeOptionSegment(extra))
		.filter((segment): segment is string => segment !== undefined);

	const segments = [
		normalizedBase,
		noWarnings ? '--no-warnings' : undefined,
		normalizedLoader,
		...normalizedExtras,
	].filter((segment): segment is string => segment !== undefined);

	if (segments.length === 0) {
		return undefined;
	}

	return segments.join(' ');
}

export function runProcess(
	command: string,
	args: readonly string[] = [],
	options: RunProcessOptions = {}
): Promise<RunProcessResult> {
	return new Promise((resolve, reject) => {
		const stdio =
			options.stdio ??
			(options.input === undefined
				? ['ignore', 'pipe', 'pipe']
				: ['pipe', 'pipe', 'pipe']);

		const child = spawn(command, args, {
			cwd: options.cwd,
			env: options.env,
			stdio,
			signal: options.signal,
		});

		let stdout = '';
		let stderr = '';

		child.stdout?.on('data', (chunk: Buffer | string) => {
			stdout += chunk.toString();
		});

		child.stderr?.on('data', (chunk: Buffer | string) => {
			stderr += chunk.toString();
		});

		const handleError = (error: Error): void => {
			child.removeAllListeners('close');
			child.removeAllListeners('error');
			reject(error);
		};

		child.once('error', handleError);
		child.once('close', (code, signal) => {
			child.removeAllListeners('error');
			resolve({
				code: code ?? 0,
				stdout,
				stderr,
				signal: signal ?? null,
			});
		});

		if (options.input !== undefined) {
			child.stdin?.end(options.input);
		}
	});
}

export interface RunNodeProcessOptions extends RunProcessOptions {
	loader?: string | undefined;
	noWarnings?: boolean;
	extras?: readonly string[];
}

export function runNodeProcess(
	scriptPath: string,
	args: readonly string[] = [],
	options: RunNodeProcessOptions = {}
): Promise<RunProcessResult> {
	const {
		loader,
		noWarnings = false,
		extras,
		env: providedEnv,
		...rest
	} = options;

	const env: NodeJS.ProcessEnv = { ...(providedEnv ?? process.env) };

	const nodeOptions = buildNodeOptions({
		base: env.NODE_OPTIONS,
		loader,
		noWarnings,
		extras,
	});

	if (nodeOptions) {
		env.NODE_OPTIONS = nodeOptions;
	} else if ('NODE_OPTIONS' in env) {
		delete env.NODE_OPTIONS;
	}

	return runProcess(process.execPath, [scriptPath, ...args], {
		...rest,
		env,
	});
}
