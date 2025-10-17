import path from 'node:path';
import fs from 'node:fs/promises';
import * as childProcess from 'node:child_process';
import {
	createAssetDependencies,
	createBundler,
	createHashedFileName,
	createExternalList,
	createGlobals,
	createRollupDriverArtifacts,
	normaliseAliasReplacement,
	queueManifestWrites,
	runViteBuild,
	toWordPressGlobal,
	toWordPressHandle,
} from '../bundler';
import { withBuilderWorkspace } from '../tests/workspace.test-support';
import { createReporter, createOutput } from '../tests/ts.test-support';

jest.mock('node:child_process', () => ({
	spawn: jest.fn(),
}));

afterEach(() => {
	const spawnMock = childProcess.spawn as jest.Mock;
	spawnMock.mockReset();
	jest.clearAllMocks();
});

describe('createBundler', () => {
	function createBuilderInput({
		namespace,
		sanitizedNamespace,
		workspaceRoot,
		phase,
	}: {
		namespace: string;
		sanitizedNamespace: string;
		workspaceRoot: string;
		phase: 'generate' | 'apply' | 'build';
	}) {
		return {
			phase,
			options: {
				config: {
					version: 1,
					namespace,
					schemas: {},
					resources: {},
				},
				namespace,
				origin: 'kernel.config.ts',
				sourcePath: path.join(workspaceRoot, 'kernel.config.ts'),
			},
			ir: {
				meta: {
					version: 1,
					namespace,
					sanitizedNamespace,
					origin: 'kernel.config.ts',
					sourcePath: 'kernel.config.ts',
				},
				config: {
					version: 1,
					namespace,
					schemas: {},
					resources: {},
				},
				schemas: [],
				resources: [],
				policies: [],
				policyMap: {
					sourcePath: undefined,
					definitions: [],
					fallback: {
						capability: 'manage_options',
						appliesTo: 'resource',
					},
					missing: [],
					unused: [],
					warnings: [],
				},
				blocks: [],
				php: {
					namespace: sanitizedNamespace,
					autoload: 'inc/',
					outputDir: '.generated/php',
				},
			},
		} as const;
	}

	it('writes rollup driver configuration and asset metadata', async () => {
		await withBuilderWorkspace(async ({ workspace, root }) => {
			await workspace.writeJson(
				'package.json',
				{
					name: 'bundler-plugin',
					version: '1.2.3',
					peerDependencies: {
						'@wordpress/data': '^10.0.0',
						'@wordpress/components': '^30.0.0',
						'@wordpress/element': '^6.0.0',
						'@wordpress/dataviews': '^9.0.0',
						'@wordpress/api-fetch': '^7.0.0',
					},
				},
				{ pretty: true }
			);

			const builder = createBundler();
			const reporter = createReporter();
			const output = createOutput();

			const input = createBuilderInput({
				namespace: 'bundler-plugin',
				sanitizedNamespace: 'BundlerPlugin',
				workspaceRoot: root,
				phase: 'generate',
			});

			await builder.apply(
				{
					context: {
						workspace,
						reporter,
						phase: 'generate',
					},
					input,
					output,
					reporter,
				},
				undefined
			);

			const configPath = path.join(
				root,
				'.wpk',
				'bundler',
				'config.json'
			);
			const assetPath = path.join(
				root,
				'.wpk',
				'bundler',
				'assets',
				'index.asset.json'
			);

			const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
			const assetManifest = JSON.parse(
				await fs.readFile(assetPath, 'utf8')
			);

			expect(config.driver).toBe('rollup');
			expect(config.external).toEqual(
				expect.arrayContaining([
					'@wordpress/data',
					'@wordpress/components',
					'@wordpress/dataviews',
					'@wordpress/hooks',
					'@wordpress/i18n',
					'@wordpress/interactivity',
					'@wordpress/api-fetch',
					'react',
					'react-dom',
				])
			);
			expect(config.alias).toContainEqual({
				find: '@/',
				replacement: './src/',
			});
			expect(config.assetManifest.path).toBe('build/index.asset.json');
			expect(config.sourcemap).toEqual({
				development: true,
				production: false,
			});
			expect(config.optimizeDeps.exclude).toEqual(config.external);

			expect(assetManifest).toMatchObject({
				entry: 'index',
				version: '1.2.3',
			});
			expect(assetManifest.file).toBe('build/index-123.js');
			expect(assetManifest.dependencies).toEqual(
				expect.arrayContaining([
					'wp-data',
					'wp-components',
					'wp-dataviews',
					'wp-hooks',
					'wp-i18n',
					'wp-interactivity',
					'wp-api-fetch',
					'wp-element',
				])
			);

			const hashedFilePath = path.join(root, assetManifest.file);
			await expect(
				fs.readFile(hashedFilePath, 'utf8')
			).resolves.toContain('AUTO-GENERATED bundler placeholder');

			expect(output.queueWrite).toHaveBeenCalled();
			const queuedFiles = (output.queueWrite as jest.Mock).mock.calls.map(
				([action]) => action.file
			);
			expect(queuedFiles).toEqual(
				expect.arrayContaining([
					path.posix.join('.wpk', 'bundler', 'config.json'),
					path.posix.join(
						'.wpk',
						'bundler',
						'assets',
						'index.asset.json'
					),
					assetManifest.file,
				])
			);

			expect(reporter.debug).toHaveBeenCalledWith(
				'Bundler configuration generated.',
				{
					files: expect.arrayContaining([
						path.posix.join('.wpk', 'bundler', 'config.json'),
						path.posix.join(
							'.wpk',
							'bundler',
							'assets',
							'index.asset.json'
						),
						assetManifest.file,
					]),
				}
			);
		});
	});

	it('rolls back workspace writes when package.json cannot be parsed', async () => {
		await withBuilderWorkspace(async ({ workspace, root }) => {
			await workspace.write('package.json', '{ invalid json');

			const builder = createBundler();
			const reporter = createReporter();
			const output = createOutput();
			const input = createBuilderInput({
				namespace: 'bundler-plugin',
				sanitizedNamespace: 'BundlerPlugin',
				workspaceRoot: root,
				phase: 'generate',
			});

			await expect(
				builder.apply(
					{
						context: {
							workspace,
							reporter,
							phase: 'generate',
						},
						input,
						output,
						reporter,
					},
					undefined
				)
			).rejects.toThrow('Failed to parse workspace package.json');

			const configExists = await workspace.exists(
				path.posix.join('.wpk', 'bundler', 'config.json')
			);
			expect(configExists).toBe(false);
			expect(output.queueWrite).not.toHaveBeenCalled();
		});
	});

	it('uses default artifact metadata when package.json is absent', async () => {
		await withBuilderWorkspace(async ({ workspace, root }) => {
			const builder = createBundler();
			const reporter = createReporter();
			const output = createOutput();

			const input = createBuilderInput({
				namespace: 'missing-plugin',
				sanitizedNamespace: 'MissingPlugin',
				workspaceRoot: root,
				phase: 'generate',
			});

			await builder.apply(
				{
					context: { workspace, reporter, phase: 'generate' },
					input,
					output,
					reporter,
				},
				undefined
			);

			const assetManifestPath = path.join(
				root,
				'.wpk',
				'bundler',
				'assets',
				'index.asset.json'
			);

			const assetManifest = JSON.parse(
				await fs.readFile(assetManifestPath, 'utf8')
			);

			expect(assetManifest.version).toBe('0.0.0');
			expect(assetManifest.file).toBe('build/index-000.js');
			expect(
				(output.queueWrite as jest.Mock).mock.calls.length
			).toBeGreaterThan(0);
		});
	});

	it('derives driver artifacts with sane defaults when package.json is missing', () => {
		const artifacts = createRollupDriverArtifacts(null);
		expect(artifacts.config.external).toEqual(
			expect.arrayContaining([
				'@wordpress/data',
				'@wordpress/components',
				'react',
			])
		);
		expect(artifacts.assetManifest.version).toBe('0.0.0');
	});

	it('preserves alias replacements that already include a trailing slash', () => {
		const artifacts = createRollupDriverArtifacts(
			{ peerDependencies: {} },
			{ aliasRoot: './custom/' }
		);
		expect(artifacts.config.alias).toContainEqual({
			find: '@/',
			replacement: './custom/',
		});
	});

	it('skips generation outside the generate phase', async () => {
		await withBuilderWorkspace(async ({ workspace, root }) => {
			const builder = createBundler();
			const reporter = createReporter();
			const output = createOutput();

			const input = createBuilderInput({
				namespace: 'skip-plugin',
				sanitizedNamespace: 'SkipPlugin',
				workspaceRoot: root,
				phase: 'apply',
			});

			await builder.apply(
				{
					context: {
						workspace,
						reporter,
						phase: 'apply',
					},
					input,
					output,
					reporter,
				},
				undefined
			);

			const configExists = await workspace.exists(
				path.posix.join('.wpk', 'bundler', 'config.json')
			);
			expect(configExists).toBe(false);
			expect(output.queueWrite).not.toHaveBeenCalled();
			expect(reporter.debug).toHaveBeenCalledWith(
				'createBundler: skipping phase without bundler support.',
				{ phase: 'apply' }
			);
		});
	});

	it('runs the bundler workflow when phase is build', async () => {
		await withBuilderWorkspace(async ({ workspace, root }) => {
			await workspace.writeJson(
				'package.json',
				{ name: 'bundler-plugin', version: '0.1.0' },
				{ pretty: true }
			);

			const run = jest.fn(async () => undefined);
			const builder = createBundler({ run });
			const reporter = createReporter();
			const output = createOutput();

			const input = createBuilderInput({
				namespace: 'bundler-plugin',
				sanitizedNamespace: 'BundlerPlugin',
				workspaceRoot: root,
				phase: 'build',
			});

			await builder.apply(
				{
					context: { workspace, reporter, phase: 'build' },
					input,
					output,
					reporter,
				},
				undefined
			);

			expect(run).toHaveBeenCalledWith({ workspace, reporter });
		});
	});
});

describe('bundler helper exports', () => {
	it('creates a deduplicated external list from package dependencies', () => {
		const externals = createExternalList({
			peerDependencies: {
				'@wordpress/data': '^10.0.0',
				react: '^18.0.0',
			},
			dependencies: {
				'@wordpress/data': '^10.0.0',
				'@wordpress/components': '^30.0.0',
				lodash: '^4.17.21',
			},
		});

		expect(externals).toEqual(
			expect.arrayContaining([
				'@wordpress/components',
				'@wordpress/data',
				'@wordpress/hooks',
				'react',
				'react-dom',
			])
		);
		expect(new Set(externals).size).toBe(externals.length);
	});

	it('maps externals to WordPress and React globals', () => {
		const globals = createGlobals([
			'@wordpress/api-fetch',
			'@wordpress/data',
			'react',
			'react-dom',
			'react/jsx-runtime',
			'react/jsx-dev-runtime',
			'lodash',
		]);

		expect(globals['@wordpress/api-fetch']).toBe('wp.apiFetch');
		expect(globals['@wordpress/data']).toBe('wp.data');
		expect(globals.react).toBe('React');
		expect(globals['react-dom']).toBe('ReactDOM');
		expect(globals['react/jsx-runtime']).toBe('React');
		expect(globals['react/jsx-dev-runtime']).toBe('React');
		expect(globals).not.toHaveProperty('lodash');
	});

	it('derives WordPress asset dependencies including react shims', () => {
		const dependencies = createAssetDependencies([
			'@wordpress/data',
			'@wordpress/hooks',
			'react',
			'react/jsx-runtime',
			'lodash',
		]);

		expect(dependencies).toEqual(['wp-data', 'wp-element', 'wp-hooks']);
	});

	it('formats WordPress globals and handles trailing slashes for aliases', () => {
		expect(toWordPressGlobal('api-fetch')).toBe('wp.apiFetch');
		expect(toWordPressGlobal('block-editor')).toBe('wp.blockEditor');
		expect(toWordPressGlobal('block--editor')).toBe('wp.blockEditor');
		expect(toWordPressHandle('api-fetch')).toBe('wp-api-fetch');

		expect(normaliseAliasReplacement('./src')).toBe('./src/');
		expect(normaliseAliasReplacement('./src/')).toBe('./src/');
	});

	it('falls back to the default hashed file name when version lacks alphanumeric characters', () => {
		const fileName = createHashedFileName('???');
		expect(fileName).toBe('index.js');
	});

	it('queues manifest writes only for files that exist', async () => {
		const output = createOutput();
		const read = jest
			.fn()
			.mockResolvedValueOnce(Buffer.from('data'))
			.mockResolvedValueOnce(null);
		await queueManifestWrites(
			{ workspace: { read } } as unknown as Parameters<
				typeof queueManifestWrites
			>[0],
			output,
			['existing', 'missing']
		);

		expect(output.queueWrite).toHaveBeenCalledTimes(1);
		expect((output.queueWrite as jest.Mock).mock.calls[0][0]).toEqual({
			file: 'existing',
			contents: expect.any(Buffer),
		});
	});

	it('runs the Vite build workflow and resolves on success', async () => {
		const listeners: Record<string, (value?: unknown) => void> = {};
		const spawnMock = childProcess.spawn as jest.Mock;
		spawnMock.mockImplementation(() => {
			const child = {
				once: jest.fn(
					(event: string, handler: (value?: unknown) => void) => {
						listeners[event] = handler;
						return child;
					}
				),
			} as unknown as childProcess.ChildProcess;
			return child;
		});

		const reporter = createReporter();
		const workspace = { cwd: () => '/tmp/workspace' } as const;
		const promise = runViteBuild({ workspace: workspace as any, reporter });
		listeners.exit?.(0);

		await expect(promise).resolves.toBeUndefined();
		expect(reporter.info).toHaveBeenCalledWith(
			'Running production bundler build via Vite.'
		);
		expect(reporter.info).toHaveBeenCalledWith('Bundler build completed.');
		expect(spawnMock).toHaveBeenCalledWith(
			'pnpm',
			['exec', 'vite', 'build'],
			expect.objectContaining({ cwd: '/tmp/workspace' })
		);
	});

	it('reports failures when the bundler process exits with an error', async () => {
		const listeners: Record<string, (value?: unknown) => void> = {};
		const spawnMock = childProcess.spawn as jest.Mock;
		spawnMock.mockImplementation(() => {
			const child = {
				once: jest.fn(
					(event: string, handler: (value?: unknown) => void) => {
						listeners[event] = handler;
						return child;
					}
				),
			} as unknown as childProcess.ChildProcess;
			return child;
		});

		const reporter = createReporter();
		const workspace = { cwd: () => '/tmp/workspace' } as const;
		const promise = runViteBuild({ workspace: workspace as any, reporter });
		listeners.exit?.(2);

		await expect(promise).rejects.toThrow(
			'Bundler build failed with exit code 2.'
		);
		expect(reporter.warn).toHaveBeenCalledWith(
			'Bundler exited with non-zero status.',
			{ exitCode: 2 }
		);
	});

	it('warns when the bundler process cannot be spawned', async () => {
		const listeners: Record<string, (value?: unknown) => void> = {};
		const spawnMock = childProcess.spawn as jest.Mock;
		spawnMock.mockImplementation(() => {
			const child = {
				once: jest.fn(
					(event: string, handler: (value?: unknown) => void) => {
						listeners[event] = handler;
						return child;
					}
				),
			} as unknown as childProcess.ChildProcess;
			return child;
		});

		const reporter = createReporter();
		const workspace = { cwd: () => '/tmp/workspace' } as const;
		const promise = runViteBuild({ workspace: workspace as any, reporter });
		listeners.error?.(new Error('spawn failed'));

		await expect(promise).rejects.toThrow('spawn failed');
		expect(reporter.warn).toHaveBeenCalledWith(
			'Bundler process failed to start.',
			{ error: 'spawn failed' }
		);
	});
});
