import { WPKernelError } from '@wpkernel/core/error';
import {
	installComposerDependencies,
	installNodeDependencies,
} from '../init/installers';
import type { InstallerDependencies } from '../init/installers';
import { createSpawnMock } from '@cli-tests/cli/process.test-support';
import type { PackageManager } from '../init/types';

describe('init installers', () => {
	const nodeManagers: PackageManager[] = ['npm', 'pnpm'];

	it.each(nodeManagers)(
		'spawns %s install while streaming output',
		async (manager) => {
			const spawnMock = createSpawnMock();
			await expect(
				installNodeDependencies('/tmp/project', manager, {
					spawn: spawnMock as unknown as InstallerDependencies['spawn'],
				})
			).resolves.toEqual({ stdout: '', stderr: '' });
			expect(spawnMock).toHaveBeenCalledWith(manager, ['install'], {
				cwd: '/tmp/project',
				stdio: ['inherit', 'pipe', 'pipe'],
			});
		}
	);

	it('wraps npm installation failures in a developer wpk error', async () => {
		const spawnMock = createSpawnMock({
			close: { code: 1, signal: null },
		});
		await expect(
			installNodeDependencies('/tmp/project', 'npm', {
				spawn: spawnMock as unknown as InstallerDependencies['spawn'],
			})
		).rejects.toBeInstanceOf(WPKernelError);

		await installNodeDependencies('/tmp/project', 'npm', {
			spawn: spawnMock as unknown as InstallerDependencies['spawn'],
		}).catch((error) => {
			expect(error).toBeInstanceOf(WPKernelError);
			const kernelError = error as WPKernelError;
			expect(kernelError.code).toBe('DeveloperError');
			expect(kernelError.message).toBe(
				'Failed to install npm dependencies.'
			);
			expect(kernelError.context).toEqual({
				message: 'npm exited with code 1',
				exitCode: 1,
				signal: undefined,
			});
		});
	});

	it('executes composer install and surfaces error context on failure', async () => {
		const successSpawn = createSpawnMock();
		await expect(
			installComposerDependencies('/tmp/project', {
				spawn: successSpawn as unknown as InstallerDependencies['spawn'],
			})
		).resolves.toEqual({ stdout: '', stderr: '' });
		expect(successSpawn).toHaveBeenCalledWith('composer', ['install'], {
			cwd: '/tmp/project',
			stdio: ['inherit', 'pipe', 'pipe'],
		});

		const failingSpawn = createSpawnMock({
			error: { message: 'composer failure', exitCode: 127 },
		});

		await expect(
			installComposerDependencies('/tmp/project', {
				spawn: failingSpawn as unknown as InstallerDependencies['spawn'],
			})
		).rejects.toBeInstanceOf(WPKernelError);

		await installComposerDependencies('/tmp/project', {
			spawn: failingSpawn as unknown as InstallerDependencies['spawn'],
		}).catch((error) => {
			expect(error).toBeInstanceOf(WPKernelError);
			const kernelError = error as WPKernelError;
			expect(kernelError.code).toBe('DeveloperError');
			expect(kernelError.message).toBe(
				'Failed to install composer dependencies.'
			);
			expect(kernelError.context).toEqual({
				message: 'composer failure',
				exitCode: 127,
				signal: undefined,
			});
		});
	});
});
