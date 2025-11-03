import { initialiseGitRepository, isGitRepository } from '../init/git';

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

	it('returns false when git reports missing repository via stderr output', async () => {
		const exec = jest.fn().mockRejectedValue(
			Object.assign(new Error('stderr path'), {
				stderr: 'fatal: not a git repository',
			})
		);

		await expect(isGitRepository('/repo/demo', { exec })).resolves.toBe(
			false
		);
	});

	it('returns false when git reports missing repository via error message', async () => {
		const exec = jest.fn().mockRejectedValue(
			Object.assign(new Error('fatal: not a git repository'), {
				message: 'fatal: not a git repository',
			})
		);

		await expect(isGitRepository('/repo/demo', { exec })).resolves.toBe(
			false
		);
	});

	it('returns false when git exits with missing repository status code', async () => {
		const exec = jest.fn().mockRejectedValue(
			Object.assign(new Error('unknown failure'), {
				code: 128,
			})
		);

		await expect(isGitRepository('/repo/demo', { exec })).resolves.toBe(
			false
		);
	});

	it('wraps unexpected git errors in a developer kernel error', async () => {
		const exec = jest.fn().mockRejectedValue(
			Object.assign(new Error('permission denied'), {
				stderr: 'fatal: permission denied',
				code: 1,
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
		).resolves.toBe(undefined);
		expect(exec).toHaveBeenCalledWith('git', ['init'], {
			cwd: '/repo/demo',
		});

		const failure = Object.assign(new Error('git init failed'), {
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
