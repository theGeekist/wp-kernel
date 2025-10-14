import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { KernelError } from '@geekist/wp-kernel/error';
import type { Reporter } from '@geekist/wp-kernel/reporter';
import { toWorkspaceRelative } from '../../utils';
import { serialiseError } from './errors';
import { statIfExists } from './fs-utils';

const execFile = promisify(execFileCallback);

export async function ensureGeneratedPhpClean({
	reporter,
	sourceDir,
	yes,
}: {
	reporter: Reporter;
	sourceDir: string;
	yes: boolean;
}): Promise<void> {
	if (yes) {
		reporter.warn(
			'Skipping generated PHP cleanliness check (--yes provided).'
		);
		return;
	}

	const stat = await statIfExists(sourceDir);
	if (!stat || !stat.isDirectory()) {
		return;
	}

	const relativeSource = toWorkspaceRelative(sourceDir);

	try {
		const { stdout } = await execFile('git', [
			'status',
			'--porcelain',
			'--',
			relativeSource,
		]);

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

function isGitRepositoryMissing(error: unknown): boolean {
	/* istanbul ignore next - fallback for string-shaped git errors */
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
