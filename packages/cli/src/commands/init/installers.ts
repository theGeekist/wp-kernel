import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { WPKernelError } from '@wpkernel/core/error';

const execFile = promisify(execFileCallback);

export interface InstallerDependencies {
	readonly exec?: typeof execFile;
}

export async function installNodeDependencies(
	cwd: string,
	{ exec = execFile }: InstallerDependencies = {}
): Promise<void> {
	try {
		await exec('npm', ['install'], { cwd });
	} catch (error) {
		throw new WPKernelError('DeveloperError', {
			message: 'Failed to install npm dependencies.',
			context: serialiseExecError(error),
		});
	}
}

export async function installComposerDependencies(
	cwd: string,
	{ exec = execFile }: InstallerDependencies = {}
): Promise<void> {
	try {
		await exec('composer', ['install'], { cwd });
	} catch (error) {
		throw new WPKernelError('DeveloperError', {
			message: 'Failed to install composer dependencies.',
			context: serialiseExecError(error),
		});
	}
}

function serialiseExecError(error: unknown): {
	message: string;
	stderr?: string;
	stdout?: string;
} {
	if (!error || typeof error !== 'object') {
		return { message: String(error) };
	}

	const message = String((error as { message?: unknown }).message ?? error);
	const stderr = (error as { stderr?: unknown }).stderr;
	const stdout = (error as { stdout?: unknown }).stdout;

	return {
		message,
		stderr: typeof stderr === 'string' ? stderr : undefined,
		stdout: typeof stdout === 'string' ? stdout : undefined,
	};
}
