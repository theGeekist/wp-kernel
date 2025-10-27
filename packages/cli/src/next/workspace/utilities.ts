import fs from 'node:fs/promises';
import type { Stats } from 'node:fs';
import path from 'node:path';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import readline from 'node:readline/promises';
import { stdin as defaultStdin, stdout as defaultStdout } from 'node:process';
import type { Reporter } from '@wpkernel/core/reporter';
import { KernelError } from '@wpkernel/core/error';
import type { Workspace } from './types';
import { serialiseError } from '../commands/apply/errors';

const execFile = promisify(execFileCallback);

export interface EnsureGeneratedPhpCleanOptions {
	readonly workspace: Workspace;
	readonly reporter: Reporter;
	readonly yes: boolean;
	readonly directory?: string;
}

export interface EnsureCleanDirectoryOptions {
	readonly workspace: Workspace;
	readonly directory: string;
	readonly force?: boolean;
	readonly create?: boolean;
	readonly reporter?: Reporter;
}

export interface ConfirmPromptOptions {
	readonly message: string;
	readonly defaultValue?: boolean;
	readonly input?: NodeJS.ReadableStream;
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
			throw new KernelError('ValidationError', {
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

		if (KernelError.isKernelError(error)) {
			throw error;
		}

		/* istanbul ignore next - git invocation failed unexpectedly */
		throw new KernelError('DeveloperError', {
			message: 'Unable to verify generated PHP cleanliness.',
			context: {
				path: relativeSource,
				error: serialiseError(error),
			},
		});
	}
}

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
		throw new KernelError('ValidationError', {
			message: 'Expected a directory.',
			context: { path: relativeDirectory },
		});
	}

	const entries = await fs.readdir(absoluteDirectory);
	if (entries.length === 0) {
		return;
	}

	if (!force) {
		throw new KernelError('ValidationError', {
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

export { toWorkspaceRelative };

export const __testing = Object.freeze({
	formatPrompt,
	parseBooleanAnswer,
	isGitRepositoryMissing,
	normaliseDirectory,
});
