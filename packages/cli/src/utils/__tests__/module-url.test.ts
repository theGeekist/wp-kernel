import path from 'node:path';

describe('module url utilities', () => {
	afterEach(() => {
		delete (globalThis as { __WPK_CLI_MODULE_URL__?: string | undefined })
			.__WPK_CLI_MODULE_URL__;
		delete process.env.WPK_CLI_IMPORT_META_URL;
		jest.resetModules();
		jest.restoreAllMocks();
		jest.clearAllMocks();
	});

	it('returns the override when __WPK_CLI_MODULE_URL__ is defined', async () => {
		(
			globalThis as { __WPK_CLI_MODULE_URL__?: string }
		).__WPK_CLI_MODULE_URL__ = 'file:///override-entry.js';

		const { getModuleUrl } = await import('../module-url');

		expect(getModuleUrl()).toBe('file:///override-entry.js');
	});

	it('falls back to the module filename when no override is provided', async () => {
		const { getModuleUrl } = await import('../module-url');

		expect(getModuleUrl()).toMatch(/^file:\/\//);
	});

	it('walks ancestor directories to resolve the CLI package root', async () => {
		(
			globalThis as { __WPK_CLI_MODULE_URL__?: string }
		).__WPK_CLI_MODULE_URL__ = 'file:///repo/packages/cli/dist/index.js';

		const readFileSync = jest.fn((target: string) => {
			if (
				target ===
				path.join('/repo', 'packages', 'cli', 'dist', 'package.json')
			) {
				const error = new Error('missing') as NodeJS.ErrnoException;
				error.code = 'ENOENT';
				throw error;
			}

			if (
				target === path.join('/repo', 'packages', 'cli', 'package.json')
			) {
				return JSON.stringify({ name: '@wpkernel/cli' });
			}

			const error = new Error(
				`unexpected read: ${target}`
			) as NodeJS.ErrnoException;
			error.code = 'ENOENT';
			throw error;
		});

		jest.doMock('node:fs', () => ({
			...jest.requireActual('node:fs'),
			readFileSync,
		}));

		const { getCliPackageRoot } = await import('../module-url');

		expect(getCliPackageRoot()).toBe(path.join('/repo', 'packages', 'cli'));
		expect(readFileSync).toHaveBeenCalled();
	});

	it('uses require.resolve fallback when walking the filesystem fails', async () => {
		(
			globalThis as { __WPK_CLI_MODULE_URL__?: string }
		).__WPK_CLI_MODULE_URL__ = 'file:///repo/packages/cli/dist/index.js';

		const readFileSync = jest.fn(() => {
			const error = new Error('missing') as NodeJS.ErrnoException;
			error.code = 'ENOENT';
			throw error;
		});

		const resolve = jest.fn(() => '/resolved/@wpkernel/cli/package.json');

		jest.doMock('node:fs', () => ({
			...jest.requireActual('node:fs'),
			readFileSync,
		}));
		jest.doMock('node:module', () => ({
			createRequire: jest.fn(() => ({ resolve })),
		}));

		const { getCliPackageRoot } = await import('../module-url');

		expect(getCliPackageRoot()).toBe(
			path.join('/resolved', '@wpkernel/cli')
		);
		expect(resolve).toHaveBeenCalledWith('@wpkernel/cli/package.json');
	});

	it('throws a developer error when the CLI package root cannot be resolved', async () => {
		(
			globalThis as { __WPK_CLI_MODULE_URL__?: string }
		).__WPK_CLI_MODULE_URL__ = 'file:///repo/packages/cli/dist/index.js';

		const readFileSync = jest.fn(() => {
			const error = new Error('missing') as NodeJS.ErrnoException;
			error.code = 'ENOENT';
			throw error;
		});

		jest.doMock('node:fs', () => ({
			...jest.requireActual('node:fs'),
			readFileSync,
		}));
		jest.doMock('node:module', () => ({
			createRequire: jest.fn(() => ({
				resolve: jest.fn(() => {
					throw new Error('resolution failed');
				}),
			})),
		}));

		const { getCliPackageRoot } = await import('../module-url');

		expect(() => getCliPackageRoot()).toThrow(
			'Unable to locate CLI package root.'
		);
	});

	it('resolves package.json paths with optional search directories', async () => {
		(
			globalThis as { __WPK_CLI_MODULE_URL__?: string }
		).__WPK_CLI_MODULE_URL__ = 'file:///repo/packages/cli/dist/index.js';

		const resolve = jest.fn(() => '/packages/example/package.json');

		jest.doMock('node:module', () => ({
			createRequire: jest.fn(() => ({ resolve })),
		}));

		const { resolvePackageJson } = await import('../module-url');

		expect(resolvePackageJson('@scope/example', ['/search'])).toBe(
			'/packages/example/package.json'
		);
		expect(resolve).toHaveBeenCalledWith('@scope/example/package.json', {
			paths: ['/search'],
		});
	});

	it('resolves package.json paths without providing search directories', async () => {
		(
			globalThis as { __WPK_CLI_MODULE_URL__?: string }
		).__WPK_CLI_MODULE_URL__ = 'file:///repo/packages/cli/dist/index.js';

		const resolve = jest.fn(() => '/packages/example/package.json');

		jest.doMock('node:module', () => ({
			createRequire: jest.fn(() => ({ resolve })),
		}));

		const { resolvePackageJson } = await import('../module-url');

		expect(resolvePackageJson('@scope/example')).toBe(
			'/packages/example/package.json'
		);
		expect(resolve).toHaveBeenCalledWith(
			'@scope/example/package.json',
			undefined
		);
	});

	it('creates module resolvers bound to the CLI module URL', async () => {
		(
			globalThis as { __WPK_CLI_MODULE_URL__?: string }
		).__WPK_CLI_MODULE_URL__ = 'file:///repo/packages/cli/dist/index.js';

		const resolve = jest.fn(() => '/resolved/module.js');

		jest.doMock('node:module', () => ({
			createRequire: jest.fn(() => ({ resolve })),
		}));

		const { createModuleResolver } = await import('../module-url');

		const resolver = createModuleResolver();
		expect(resolver('./local.js')).toBe('/resolved/module.js');
		expect(resolve).toHaveBeenCalledWith('./local.js', undefined);
	});

	it('respects the WPK_CLI_IMPORT_META_URL override', async () => {
		process.env.WPK_CLI_IMPORT_META_URL = 'file:///import-meta-from-env.js';

		const { getModuleUrl } = await import('../module-url');

		expect(getModuleUrl()).toBe('file:///import-meta-from-env.js');
	});
});
