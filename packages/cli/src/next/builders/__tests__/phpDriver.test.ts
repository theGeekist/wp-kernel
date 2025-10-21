import { execFile } from 'node:child_process';
import path from 'node:path';
import type { Reporter } from '@wpkernel/core/reporter';
import { createPhpDriverInstaller } from '../phpDriver';
import type { Workspace } from '../../workspace/types';

jest.mock('node:child_process', () => {
	const execFileMock = jest.fn(
		(
			_cmd: string,
			_args: readonly string[],
			_options: unknown,
			callback?: (
				error: Error | null,
				stdout: string,
				stderr: string
			) => void
		) => {
			callback?.(null, '', '');
		}
	);

	return { execFile: execFileMock };
});

const reporter: Reporter = {
	debug: jest.fn(),
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
	child: jest.fn().mockReturnThis(),
};

function createWorkspace(existsMock: jest.Mock): Workspace {
	return {
		root: '/workspace',
		resolve: (...parts: string[]) => path.join('/workspace', ...parts),
		exists: existsMock,
	} as unknown as Workspace;
}

describe('createPhpDriverInstaller', () => {
	const helper = createPhpDriverInstaller();
	const existsMock = jest.fn();
	const workspace = createWorkspace(existsMock);
	const context = {
		workspace,
		phase: 'generate' as const,
		reporter,
	};

	beforeEach(() => {
		existsMock.mockReset();
		jest.clearAllMocks();
	});

	it('runs composer install when vendor autoload is missing', async () => {
		existsMock.mockImplementation(async (target) => {
			if (target.endsWith('composer.json')) {
				return true;
			}
			if (target.endsWith('vendor/autoload.php')) {
				return false;
			}
			return false;
		});

		await helper.apply(
			{
				context,
				input: undefined as never,
				output: undefined as never,
				reporter,
			},
			undefined
		);

		expect(reporter.info).toHaveBeenCalledWith(
			expect.stringContaining('Installing nikic/php-parser')
		);
		expect(execFile).toHaveBeenCalledWith(
			'composer',
			['install'],
			expect.objectContaining({ cwd: context.workspace.root }),
			expect.any(Function)
		);
	});

	it('logs debug when dependency already present', async () => {
		existsMock.mockImplementation(async (target) => {
			if (target.endsWith('composer.json')) {
				return true;
			}
			if (target.endsWith('vendor/autoload.php')) {
				return true;
			}
			return false;
		});

		await helper.apply(
			{
				context,
				input: undefined as never,
				output: undefined as never,
				reporter,
			},
			undefined
		);

		expect(reporter.debug).toHaveBeenCalledWith(
			'PHP parser dependency detected via composer.'
		);
		expect(execFile).not.toHaveBeenCalled();
	});

	it('throws KernelError when composer install fails', async () => {
		existsMock.mockImplementation(async (target) => {
			if (target.endsWith('composer.json')) {
				return true;
			}
			if (target.endsWith('vendor/autoload.php')) {
				return false;
			}
			return false;
		});
		(execFile as unknown as jest.Mock).mockImplementationOnce(
			(
				_cmd: string,
				_args: readonly string[],
				_options: unknown,
				callback?: (
					error: Error | null,
					stdout: string,
					stderr: string
				) => void
			) => {
				callback?.(new Error('boom'), '', '');
			}
		);

		await expect(
			helper.apply(
				{
					context,
					input: undefined as never,
					output: undefined as never,
					reporter,
				},
				undefined
			)
		).rejects.toMatchObject({ code: 'DeveloperError' });

		expect(reporter.error).toHaveBeenCalled();
	});

	it('normalizes non-Error failures from composer install', async () => {
		existsMock.mockImplementation(async (target) => {
			if (target.endsWith('composer.json')) {
				return true;
			}
			if (target.endsWith('vendor/autoload.php')) {
				return false;
			}
			return false;
		});
		(execFile as unknown as jest.Mock).mockImplementationOnce(
			(
				_cmd: string,
				_args: readonly string[],
				_options: unknown,
				callback?: (
					error: unknown,
					stdout: string,
					stderr: string
				) => void
			) => {
				callback?.('fatal', '', '');
			}
		);

		await expect(
			helper.apply(
				{
					context,
					input: undefined as never,
					output: undefined as never,
					reporter,
				},
				undefined
			)
		).rejects.toMatchObject({ code: 'DeveloperError' });

		expect(reporter.error).toHaveBeenCalledWith(
			expect.stringContaining('Composer install failed'),
			expect.objectContaining({ error: 'fatal' })
		);
	});
});
