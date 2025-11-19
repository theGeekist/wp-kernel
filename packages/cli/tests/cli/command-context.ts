import { createMemoryStream, type MemoryStream } from './memory-stream.js';

/**
 * Base interface for a command execution context.
 *
 * @category CLI Helpers
 */
export interface BaseContext {
	/** The standard output stream. */
	stdout: MemoryStream;
	/** The standard error stream. */
	stderr: MemoryStream;
	/** The standard input stream. */
	stdin: NodeJS.ReadStream;
	/** The environment variables for the command. */
	env: NodeJS.ProcessEnv;
	/** A function that returns the current working directory. */
	cwd: () => string;
	/** The color depth of the terminal. */
	colorDepth: number;
	/** Additional properties for the context. */
	[key: string]: unknown;
}

/**
 * Options for creating a command context.
 *
 * @category CLI Helpers
 */
export interface CommandContextOptions {
	/** The current working directory for the command. Can be a string or a function returning a string. */
	cwd?: string | (() => string);
	/** The environment variables for the command. */
	env?: NodeJS.ProcessEnv;
	/** The standard input stream for the command. */
	stdin?: NodeJS.ReadStream;
	/** The color depth of the terminal. */
	colorDepth?: number;
}

/**
 * A harness containing the created command context and associated streams.
 *
 * @category CLI Helpers
 */
export interface CommandContextHarness {
	/** The created command context. */
	context: BaseContext;
	/** The `MemoryStream` for standard output. */
	stdout: MemoryStream;
	/** The `MemoryStream` for standard error. */
	stderr: MemoryStream;
}

/**
 * Creates a new command context harness with configurable options.
 *
 * @category CLI Helpers
 * @param    options - Options for configuring the command context.
 * @returns A `CommandContextHarness` object.
 */
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

/**
 * Assigns a newly created command context to an existing command object.
 *
 * @category CLI Helpers
 * @param    command - The command object to assign the context to.
 * @param    options - Options for configuring the new command context.
 * @returns A `CommandContextHarness` combined with the original command object.
 */
export function assignCommandContext<T extends { context: unknown }>(
	command: T,
	options: CommandContextOptions = {}
): CommandContextHarness & { command: T } {
	const harness = createCommandContext(options);
	command.context = harness.context as T['context'];
	return { ...harness, command };
}
