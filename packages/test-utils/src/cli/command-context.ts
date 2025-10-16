import { createMemoryStream, type MemoryStream } from './memory-stream.js';

export interface BaseContext {
	stdout: MemoryStream;
	stderr: MemoryStream;
	stdin: NodeJS.ReadStream;
	env: NodeJS.ProcessEnv;
	cwd: () => string;
	colorDepth: number;
	[key: string]: unknown;
}

export interface CommandContextOptions {
	cwd?: string | (() => string);
	env?: NodeJS.ProcessEnv;
	stdin?: NodeJS.ReadStream;
	colorDepth?: number;
}

export interface CommandContextHarness {
	context: BaseContext;
	stdout: MemoryStream;
	stderr: MemoryStream;
}

export function createCommandContext(
	options: CommandContextOptions = {}
): CommandContextHarness {
	const {
		cwd = () => process.cwd(),
		env = process.env,
		stdin = process.stdin,
		colorDepth = 1,
	} = options;

	const stdout = createMemoryStream();
	const stderr = createMemoryStream();

	const context: BaseContext = {
		stdout,
		stderr,
		stdin,
		env,
		cwd: typeof cwd === 'function' ? cwd : () => cwd,
		colorDepth,
	} as BaseContext;

	return { context, stdout, stderr };
}

export function assignCommandContext<T extends { context: unknown }>(
	command: T,
	options: CommandContextOptions = {}
): CommandContextHarness & { command: T } {
	const harness = createCommandContext(options);
	command.context = harness.context as T['context'];
	return { ...harness, command };
}
