import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { KernelError } from '@wpkernel/core/error';

const execFile = promisify(execFileCallback);

export interface GitDependencies {
	readonly exec?: typeof execFile;
}

export async function isGitRepository(
	cwd: string,
	{ exec = execFile }: GitDependencies = {}
): Promise<boolean> {
	try {
		const { stdout } = await exec(
			'git',
			['rev-parse', '--is-inside-work-tree'],
			{
				cwd,
			}
		);
		return stdout.trim() === 'true';
	} catch (error) {
		if (isGitMissing(error)) {
			return false;
		}

		throw new KernelError('DeveloperError', {
			message: 'Unable to determine git repository status.',
			context: { error: serialiseExecError(error) },
		});
	}
}

export async function initialiseGitRepository(
	cwd: string,
	{ exec = execFile }: GitDependencies = {}
): Promise<void> {
	try {
		await exec('git', ['init'], { cwd });
	} catch (error) {
		throw new KernelError('DeveloperError', {
			message: 'Failed to initialise git repository.',
			context: { error: serialiseExecError(error) },
		});
	}
}

function isGitMissing(error: unknown): boolean {
	if (!error || typeof error !== 'object') {
		return false;
	}

	const stderr = String((error as { stderr?: unknown }).stderr ?? '');
	const message = String((error as { message?: unknown }).message ?? '');

	if (stderr.includes('not a git repository')) {
		return true;
	}

	if (message.includes('not a git repository')) {
		return true;
	}

	const code = (error as { code?: number | string }).code;
	if (code === 128 || code === '128') {
		return true;
	}

	return false;
}

function serialiseExecError(error: unknown): {
	message: string;
	stderr?: string;
} {
	if (!error || typeof error !== 'object') {
		return { message: String(error) };
	}

	return {
		message: String((error as { message?: unknown }).message ?? error),
		stderr: (error as { stderr?: unknown }).stderr
			? String((error as { stderr?: unknown }).stderr)
			: undefined,
	};
}
