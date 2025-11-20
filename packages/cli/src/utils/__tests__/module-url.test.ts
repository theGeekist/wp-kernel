import path from 'node:path';
import { createMockFs } from '@cli-tests/mocks/fs';

const mockedFs = createMockFs();
jest.mock('node:fs', () => ({
	...jest.requireActual('node:fs'),
	...mockedFs,
}));

describe('module url utilities', () => {
	beforeEach(() => {
		// Clean up state before each test.
		delete (globalThis as { __WPK_CLI_MODULE_URL__?: string })
			.__WPK_CLI_MODULE_URL__;
		delete process.env.WPK_CLI_IMPORT_META_URL;

		mockedFs.files.clear();
		mockedFs.readFileSync.mockClear();
		jest.resetModules();
		jest.restoreAllMocks();
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
		mockedFs.files.set(
			path.join('/repo', 'packages', 'cli', 'package.json'),
			Buffer.from(JSON.stringify({ name: '@wpkernel/cli' }))
		);

		const { getCliPackageRoot } = await import('../module-url');

		expect(getCliPackageRoot()).toBe(path.join('/repo', 'packages', 'cli'));
		expect(mockedFs.readFileSync).toHaveBeenCalled();
	});

	it('uses require.resolve fallback when walking the filesystem fails', async () => {
		(
			globalThis as { __WPK_CLI_MODULE_URL__?: string }
		).__WPK_CLI_MODULE_URL__ = 'file:///repo/packages/cli/dist/index.js';
		const resolve = jest.fn(() => '/resolved/@wpkernel/cli/package.json');

		jest.doMock('node:module', () => ({
			createRequire: jest.fn(() => ({ resolve })),
		}));

		const { getCliPackageRoot } = await import('../module-url');

		expect(getCliPackageRoot()).toBe(
			path.join('/resolved', '@wpkernel/cli')
		);
		expect(resolve).toHaveBeenCalledWith('@wpkernel/cli/package.json');
		expect(mockedFs.readFileSync).toHaveBeenCalled();
	});

	it('throws a developer error when the CLI package root cannot be resolved', async () => {
		(
			globalThis as { __WPK_CLI_MODULE_URL__?: string }
		).__WPK_CLI_MODULE_URL__ = 'file:///repo/packages/cli/dist/index.js';
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
