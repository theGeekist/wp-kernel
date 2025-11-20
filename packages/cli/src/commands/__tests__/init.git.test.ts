import { initialiseGitRepository, isGitRepository } from '../init/git';

type GitExecError = NodeJS.ErrnoException & {
	stderr?: string;
	stdout?: string;
	code?: number | string;
};

function createGitError(overrides: Partial<GitExecError> = {}): GitExecError {
	const error = new Error(overrides.message ?? 'git failed') as GitExecError;
	Object.assign(error, overrides);
	if (typeof overrides.code !== 'undefined') {
		error.code = overrides.code;
	}
	return error;
}

describe('init git helpers', () => {
	it('detects git repositories when rev-parse succeeds', async () => {
		const exec = jest.fn().mockResolvedValue({ stdout: 'true\n' });

		await expect(isGitRepository('/repo/demo', { exec })).resolves.toBe(
			true
		);

		expect(exec).toHaveBeenCalledWith(
			'git',
			['rev-parse', '--is-inside-work-tree'],
			expect.objectContaining({ cwd: '/repo/demo' })
		);
	});

	it.each([
		[
			'stderr indicates missing repo',
			createGitError({ stderr: 'fatal: not a git repository' }),
		],
		[
			'error message indicates missing repo',
			createGitError({ message: 'fatal: not a git repository' }),
		],
		[
			'exit code 128 indicates missing repo',
			createGitError({ code: '128' }),
		],
	])('returns false when %s', async (_label, error) => {
		const exec = jest.fn().mockRejectedValue(error);

		await expect(isGitRepository('/repo/demo', { exec })).resolves.toBe(
			false
		);
	});

	it('wraps unexpected git errors in a developer wpk error', async () => {
		const exec = jest.fn().mockRejectedValue(
			createGitError({
				message: 'permission denied',
				stderr: 'fatal: permission denied',
				code: '1',
			})
		);

		await expect(isGitRepository('/repo/demo', { exec })).rejects.toEqual(
			expect.objectContaining({
				code: 'DeveloperError',
				message: 'Unable to determine git repository status.',
			})
		);
	});

	it('initialises git repositories and wraps failures consistently', async () => {
		const exec = jest.fn().mockResolvedValue(undefined);

		await expect(
			initialiseGitRepository('/repo/demo', { exec })
		).resolves.toBeUndefined();
		expect(exec).toHaveBeenCalledWith('git', ['init'], {
			cwd: '/repo/demo',
		});

		const failure = createGitError({
			message: 'git init failed',
			stderr: 'fatal: permission denied',
		});

		await expect(
			initialiseGitRepository('/repo/demo', {
				exec: jest.fn().mockRejectedValue(failure),
			})
		).rejects.toEqual(
			expect.objectContaining({
				code: 'DeveloperError',
				message: 'Failed to initialise git repository.',
				context: {
					error: {
						message: 'git init failed',
						stderr: 'fatal: permission denied',
					},
				},
			})
		);
	});
});
