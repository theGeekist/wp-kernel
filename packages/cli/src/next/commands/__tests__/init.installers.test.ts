import { WPKernelError } from '@wpkernel/core/error';
import {
	installComposerDependencies,
	installNodeDependencies,
} from '../init/installers';
import type { InstallerDependencies } from '../init/installers';

describe('init installers', () => {
	it('executes npm install with the provided exec implementation', async () => {
		const execMock = jest.fn(
			async (
				command: string,
				args: string[],
				options: { cwd: string }
			) => {
				expect(command).toBe('npm');
				expect(args).toEqual(['install']);
				expect(options.cwd).toBe('/tmp/project');
			}
		);
		const exec = execMock as unknown as InstallerDependencies['exec'];

		await expect(
			installNodeDependencies('/tmp/project', { exec })
		).resolves.toBeUndefined();
		expect(execMock).toHaveBeenCalledTimes(1);
	});

	it('wraps npm installation failures in a developer kernel error', async () => {
		const execMock = jest.fn(async () => {
			const error = new Error('npm failure');
			(error as { stderr?: string }).stderr = 'fatal';
			(error as { stdout?: string }).stdout = 'diagnostics';
			throw error;
		});
		const exec = execMock as unknown as InstallerDependencies['exec'];

		await expect(
			installNodeDependencies('/tmp/project', { exec })
		).rejects.toBeInstanceOf(WPKernelError);

		await installNodeDependencies('/tmp/project', { exec }).catch(
			(error) => {
				expect(error).toBeInstanceOf(WPKernelError);
				const kernelError = error as WPKernelError;
				expect(kernelError.code).toBe('DeveloperError');
				expect(kernelError.message).toBe(
					'Failed to install npm dependencies.'
				);
				expect(kernelError.context).toEqual({
					message: 'npm failure',
					stderr: 'fatal',
					stdout: 'diagnostics',
				});
			}
		);
	});

	it('executes composer install and surfaces error context on failure', async () => {
		const successExecMock = jest.fn(
			async (
				command: string,
				args: string[],
				options: { cwd: string }
			) => {
				expect(command).toBe('composer');
				expect(args).toEqual(['install']);
				expect(options.cwd).toBe('/tmp/project');
			}
		);
		const successExec =
			successExecMock as unknown as InstallerDependencies['exec'];

		await expect(
			installComposerDependencies('/tmp/project', { exec: successExec })
		).resolves.toBeUndefined();

		const failingExecMock = jest.fn(async () => {
			const error = new Error('composer failure');
			(error as { stderr?: string }).stderr = 'stderr output';
			throw error;
		});
		const failingExec =
			failingExecMock as unknown as InstallerDependencies['exec'];

		await expect(
			installComposerDependencies('/tmp/project', { exec: failingExec })
		).rejects.toBeInstanceOf(WPKernelError);

		await installComposerDependencies('/tmp/project', {
			exec: failingExec,
		}).catch((error) => {
			expect(error).toBeInstanceOf(WPKernelError);
			const kernelError = error as WPKernelError;
			expect(kernelError.code).toBe('DeveloperError');
			expect(kernelError.message).toBe(
				'Failed to install composer dependencies.'
			);
			expect(kernelError.context).toEqual({
				message: 'composer failure',
				stderr: 'stderr output',
				stdout: undefined,
			});
		});
	});
});
