import { KernelError } from '@wpkernel/core/error';
import { createPhpDriverInstaller } from '../installer/createPhpDriverInstaller';
import type { WorkspaceLike } from '../types';

type Logger = ReturnType<typeof createLogger>;

type Workspace = WorkspaceLike & {
	resolve: jest.Mock<string, [string]>;
	exists: jest.Mock<Promise<boolean>, [string]>;
};

const execFileMock = jest.fn();

jest.mock('node:util', () => ({
	promisify: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
}));

jest.mock('node:child_process', () => ({
	execFile: (...args: unknown[]) => execFileMock(...args),
}));

function createLogger() {
	return {
		info: jest.fn(),
		debug: jest.fn(),
		error: jest.fn(),
	} satisfies {
		info: jest.Mock;
		debug: jest.Mock;
		error: jest.Mock;
	};
}

function baseWorkspace(): Workspace {
	return {
		root: '/workspace',
		resolve: jest.fn((file: string) => `/workspace/${file}`),
		exists: jest.fn(async (_target: string) => true),
	} satisfies Workspace;
}

function createWorkspace(overrides: Partial<Workspace> = {}): Workspace {
	return { ...baseWorkspace(), ...overrides };
}

describe('createPhpDriverInstaller', () => {
	let logger: Logger;

	beforeEach(() => {
		execFileMock.mockReset();
		logger = createLogger();
	});

	it('skips installation when vendor autoload exists', async () => {
		const workspace = createWorkspace();
		const installer = createPhpDriverInstaller();

		const result = await installer.install({ workspace, logger });

		expect(result).toEqual({
			installed: false,
			skippedReason: 'already-installed',
		});
		expect(workspace.resolve).toHaveBeenNthCalledWith(1, 'composer.json');
		expect(workspace.resolve).toHaveBeenNthCalledWith(
			2,
			'vendor/autoload.php'
		);
		expect(workspace.exists).toHaveBeenNthCalledWith(
			1,
			'/workspace/composer.json'
		);
		expect(workspace.exists).toHaveBeenNthCalledWith(
			2,
			'/workspace/vendor/autoload.php'
		);
		expect(execFileMock).not.toHaveBeenCalled();
		expect(logger.debug).toHaveBeenCalledWith(
			'PHP parser dependency detected via composer.'
		);
	});

	it('installs dependencies via composer when vendor autoload is missing', async () => {
		execFileMock.mockResolvedValue({ stdout: '', stderr: '' });

		const workspace = createWorkspace({
			exists: jest.fn(async (target: string) =>
				target.endsWith('composer.json')
			),
		});
		const installer = createPhpDriverInstaller();

		const result = await installer.install({ workspace, logger });

		expect(result).toEqual({ installed: true });
		expect(execFileMock).toHaveBeenCalledWith('composer', ['install'], {
			cwd: workspace.root,
		});
		expect(logger.info).toHaveBeenNthCalledWith(
			1,
			'Installing nikic/php-parser via composer (composer install).'
		);
		expect(logger.info).toHaveBeenNthCalledWith(
			2,
			'nikic/php-parser installed successfully.'
		);
	});

	it('wraps composer failures in a KernelError', async () => {
		execFileMock.mockRejectedValue(new Error('composer failed'));

		const workspace = createWorkspace({
			exists: jest.fn(async (target: string) =>
				target.endsWith('composer.json')
			),
		});
		const installer = createPhpDriverInstaller();

		await expect(
			installer.install({ workspace, logger })
		).rejects.toBeInstanceOf(KernelError);

		expect(logger.error).toHaveBeenCalledWith(
			'Composer install failed while fetching nikic/php-parser.',
			expect.objectContaining({ error: expect.any(Error) })
		);
	});

	it('skips installation when composer.json is missing', async () => {
		const workspace = createWorkspace({
			exists: jest.fn(async (target: string) =>
				target.endsWith('vendor/autoload.php')
			),
		});
		const installer = createPhpDriverInstaller();

		const result = await installer.install({ workspace, logger });

		expect(result).toEqual({
			installed: false,
			skippedReason: 'missing-manifest',
		});
		expect(logger.debug).toHaveBeenCalledWith(
			'createPhpDriverInstaller: composer.json missing, skipping installer.'
		);
		expect(execFileMock).not.toHaveBeenCalled();
	});
});
