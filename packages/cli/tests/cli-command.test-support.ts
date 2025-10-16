import type { BaseContext } from 'clipanion';
import { MemoryStream } from './memory-stream.test-support';

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

	const stdout = new MemoryStream();
	const stderr = new MemoryStream();

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
