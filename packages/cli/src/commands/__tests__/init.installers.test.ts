import { EventEmitter } from 'node:events';
import { WPKernelError } from '@wpkernel/core/error';
import {
	installComposerDependencies,
	installNodeDependencies,
} from '../init/installers';
import type { InstallerDependencies } from '../init/installers';

function createSpawnMock({
	onClose,
	onError,
}: {
	onClose?: (emit: EventEmitter['emit']) => void;
	onError?: (emit: EventEmitter['emit']) => void;
} = {}) {
	return jest.fn(() => {
		const child = new EventEmitter();
		process.nextTick(() => {
			if (onClose) {
				onClose(child.emit.bind(child));
			} else {
				child.emit('close', 0, null);
			}
		});

		if (onError) {
			process.nextTick(() => onError(child.emit.bind(child)));
		}

		return child as unknown as ReturnType<
			NonNullable<InstallerDependencies['spawn']>
		>;
	});
}

describe('init installers', () => {
	it('spawns npm install while streaming output', async () => {
		const spawnMock = createSpawnMock();
		await expect(
			installNodeDependencies('/tmp/project', {
				spawn: spawnMock as unknown as InstallerDependencies['spawn'],
			})
		).resolves.toEqual({ stdout: '', stderr: '' });
		expect(spawnMock).toHaveBeenCalledWith('npm', ['install'], {
			cwd: '/tmp/project',
			stdio: ['inherit', 'pipe', 'pipe'],
		});
	});

	it('wraps npm installation failures in a developer wpk error', async () => {
		const spawnMock = createSpawnMock({
			onClose: (emit) => emit('close', 1, null),
		});
		await expect(
			installNodeDependencies('/tmp/project', {
				spawn: spawnMock as unknown as InstallerDependencies['spawn'],
			})
		).rejects.toBeInstanceOf(WPKernelError);

		await installNodeDependencies('/tmp/project', {
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
			onClose: () => undefined,
			onError: (emit) =>
				emit('error', {
					message: 'composer failure',
					exitCode: 127,
				}),
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
