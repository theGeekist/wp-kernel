import fs from 'node:fs/promises';
import type { Stats } from 'node:fs';
import path from 'node:path';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import readline from 'node:readline/promises';
import { stdin as defaultStdin, stdout as defaultStdout } from 'node:process';
import type { Reporter } from '@wpkernel/core/reporter';
import { WPKernelError } from '@wpkernel/core/error';
import type { Workspace } from './types';
import { serialiseError } from '../commands/apply/errors';

const execFile = promisify(execFileCallback);

/**
 * Options for the `ensureGeneratedPhpClean` function.
 *
 * @category Workspace
 */
export interface EnsureGeneratedPhpCleanOptions {
	/** The workspace instance. */
	readonly workspace: Workspace;
	/** The reporter instance for logging. */
	readonly reporter: Reporter;
	/** Whether to skip the cleanliness check (e.g., when `--yes` is provided). */
	readonly yes: boolean;
	/** Optional: The directory to check for generated PHP files. Defaults to `.generated/php`. */
	readonly directory?: string;
}

/**
 * Options for the `ensureCleanDirectory` function.
 *
 * @category Workspace
 */
export interface EnsureCleanDirectoryOptions {
	/** The workspace instance. */
	readonly workspace: Workspace;
	/** The directory to ensure is clean. */
	readonly directory: string;
	/** Whether to force the cleanup, even if the directory is not empty. */
	readonly force?: boolean;
	/** Whether to create the directory if it doesn't exist. */
	readonly create?: boolean;
	/** Optional: The reporter instance for logging. */
	readonly reporter?: Reporter;
}

/**
 * Options for the `promptConfirm` function.
 *
 * @category Workspace
 */
export interface ConfirmPromptOptions {
	/** The message to display to the user. */
	readonly message: string;
	/** Optional: The default value if the user just presses Enter. */
	readonly defaultValue?: boolean;
	/** Optional: The input stream to read from. Defaults to `process.stdin`. */
	readonly input?: NodeJS.ReadableStream;
	/** Optional: The output stream to write to. Defaults to `process.stdout`. */
	readonly output?: NodeJS.WritableStream;
}

async function statIfExists(target: string): Promise<Stats | null> {
	try {
		return await fs.lstat(target);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return null;
		}

		throw error;
	}
}

function toWorkspaceRelative(workspace: Workspace, absolute: string): string {
	const relative = path.relative(workspace.root, absolute);
	if (relative === '') {
		return '.';
	}

	return relative.split(path.sep).join('/');
}

function normaliseDirectory(directory: string, workspace: Workspace): string {
	if (path.isAbsolute(directory)) {
		return directory;
	}

	return workspace.resolve(directory);
}

function isGitRepositoryMissing(error: unknown): boolean {
	if (typeof error === 'string') {
		return error.includes('not a git repository');
	}

	if (typeof error === 'object' && error !== null) {
		const message =
			typeof (error as { message?: unknown }).message === 'string'
				? ((error as { message?: string }).message as string)
				: '';
		const stderr =
			typeof (error as { stderr?: unknown }).stderr === 'string'
				? ((error as { stderr?: string }).stderr as string)
				: '';

		if (message.includes('not a git repository')) {
			return true;
		}

		if (stderr.includes('not a git repository')) {
			return true;
		}
	}

	return false;
}

/**
 * Ensures that the generated PHP directory is clean (i.e., no uncommitted changes).
 *
 * This function checks the Git status of the specified directory. If uncommitted
 * changes are found, it throws a `WPKernelError` unless the `yes` option is true.
 *
 * @category Workspace
 * @param    options.workspace
 * @param    options.reporter
 * @param    options.yes
 * @param    options.directory
 * @param    options           - Options for the cleanliness check.
 * @throws `WPKernelError` if uncommitted changes are found and `yes` is false.
 */
export async function ensureGeneratedPhpClean({
	workspace,
	reporter,
	yes,
	directory = path.join('.generated', 'php'),
}: EnsureGeneratedPhpCleanOptions): Promise<void> {
	if (yes) {
		reporter.warn(
			'Skipping generated PHP cleanliness check (--yes provided).'
		);
		return;
	}

	const absoluteDirectory = normaliseDirectory(directory, workspace);
	const stat = await statIfExists(absoluteDirectory);
	if (!stat || !stat.isDirectory()) {
		return;
	}

	const relativeSource = toWorkspaceRelative(workspace, absoluteDirectory);

	try {
		const { stdout } = await execFile(
			'git',
			['status', '--porcelain', '--', relativeSource],
			{ cwd: workspace.root }
		);

		if (stdout.trim().length > 0) {
			throw new WPKernelError('ValidationError', {
				message: 'Generated PHP directory has uncommitted changes.',
				context: {
					path: relativeSource,
					statusOutput: stdout.trim().split('\n'),
				},
			});
		}
	} catch (error) {
		if (isGitRepositoryMissing(error)) {
			reporter.debug(
				'Skipping generated PHP cleanliness check (not a git repository).'
			);
			return;
		}

		if (WPKernelError.isWPKernelError(error)) {
			throw error;
		}

		/* istanbul ignore next - git invocation failed unexpectedly */
		throw new WPKernelError('DeveloperError', {
			message: 'Unable to verify generated PHP cleanliness.',
			context: {
				path: relativeSource,
				error: serialiseError(error),
			},
		});
	}
}

/**
 * Ensures that a given directory is clean (empty) or creates it if it doesn't exist.
 *
 * If the directory exists and is not empty, it will throw a `WPKernelError`
 * unless `force` is true, in which case it will clear the directory contents.
 *
 * @category Workspace
 * @param    options.workspace
 * @param    options.directory
 * @param    options.force
 * @param    options.create
 * @param    options.reporter
 * @param    options           - Options for ensuring the directory is clean.
 * @throws `WPKernelError` if the directory is not empty and `force` is false, or if it's not a directory.
 */
export async function ensureCleanDirectory({
	workspace,
	directory,
	force = false,
	create = true,
	reporter,
}: EnsureCleanDirectoryOptions): Promise<void> {
	const absoluteDirectory = normaliseDirectory(directory, workspace);
	const relativeDirectory = toWorkspaceRelative(workspace, absoluteDirectory);
	const stat = await statIfExists(absoluteDirectory);

	if (!stat) {
		if (create) {
			await fs.mkdir(absoluteDirectory, { recursive: true });
		}
		return;
	}

	if (!stat.isDirectory()) {
		throw new WPKernelError('ValidationError', {
			message: 'Expected a directory.',
			context: { path: relativeDirectory },
		});
	}

	const entries = await fs.readdir(absoluteDirectory);
	if (entries.length === 0) {
		return;
	}

	if (!force) {
		throw new WPKernelError('ValidationError', {
			message: 'Directory is not empty.',
			context: {
				path: relativeDirectory,
				entries: entries.sort(),
			},
		});
	}

	reporter?.info?.('Clearing directory contents.', {
		path: relativeDirectory,
	});
	await fs.rm(absoluteDirectory, { recursive: true, force: true });
	await fs.mkdir(absoluteDirectory, { recursive: true });
}

function formatPrompt(
	message: string,
	defaultValue: boolean | undefined
): string {
	let suffix = ' (y/n) ';

	if (defaultValue === true) {
		suffix = ' (Y/n) ';
	} else if (defaultValue === false) {
		suffix = ' (y/N) ';
	}

	return `${message}${suffix}`;
}

function parseBooleanAnswer(
	answer: string,
	defaultValue: boolean | undefined
): boolean {
	const normalised = answer.trim().toLowerCase();
	if (normalised === '') {
		return defaultValue ?? false;
	}

	if (normalised === 'y' || normalised === 'yes') {
		return true;
	}

	if (normalised === 'n' || normalised === 'no') {
		return false;
	}

	return defaultValue ?? false;
}

/**
 * Prompts the user for a yes/no confirmation.
 *
 * @category Workspace
 * @param    options.message
 * @param    options.defaultValue
 * @param    options.input
 * @param    options.output
 * @param    options              - Options for the confirmation prompt.
 * @returns A promise that resolves to `true` for yes, `false` for no.
 */
export async function promptConfirm({
	message,
	defaultValue,
	input = defaultStdin,
	output = defaultStdout,
}: ConfirmPromptOptions): Promise<boolean> {
	const rl = readline.createInterface({ input, output });

	try {
		const question = formatPrompt(message, defaultValue);
		const answer = await rl.question(question);
		return parseBooleanAnswer(answer, defaultValue);
	} finally {
		rl.close();
	}
}

/**
 * Converts an absolute path to a path relative to the workspace root.
 *
 * @category Workspace
 * @param    workspace - The workspace instance.
 * @param    absolute  - The absolute path to convert.
 * @returns The path relative to the workspace root, using POSIX separators.
 */
export { toWorkspaceRelative };

export const __testing = Object.freeze({
	formatPrompt,
	parseBooleanAnswer,
	isGitRepositoryMissing,
	normaliseDirectory,
});
