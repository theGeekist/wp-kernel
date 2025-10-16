import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import type { InitCommand } from '../init';
import { WPK_EXIT_CODES } from '@wpkernel/core/contracts';
import { assignCommandContext } from '../../../tests/cli-command.test-support';
import { withWorkspace as withTemporaryWorkspace } from '../../../tests/workspace.test-support';

const TMP_PREFIX = path.join(os.tmpdir(), 'wpk-init-command-');

describe('InitCommand', () => {
	afterEach(() => {
		delete (globalThis as { __WPK_CLI_MODULE_URL__?: string })
			.__WPK_CLI_MODULE_URL__;
		jest.resetModules();
	});

	it('scaffolds project files with recommended defaults', async () => {
		await withWorkspace(async (workspace) => {
			const { command, stdout } = await createCommand(workspace);
			command.name = 'jobs-plugin';

			const exit = await command.execute();

			expect(exit).toBe(WPK_EXIT_CODES.SUCCESS);
			const summary = stdout.toString();
			expect(summary).toContain(
				'created plugin scaffold for jobs-plugin'
			);
			expect(summary).toContain('created kernel.config.ts');
			expect(summary).toContain('created src/index.ts');
			expect(summary).toContain('created tsconfig.json');
			expect(summary).toContain('created jsconfig.json');
			expect(summary).toContain('created eslint.config.js');
			expect(summary).toContain('created vite.config.ts');
			expect(summary).toContain('created package.json');
			expect(summary).toContain('created composer.json');
			expect(summary).toContain('created inc/.gitkeep');

			const kernelConfig = await fs.readFile(
				path.join(workspace, 'kernel.config.ts'),
				'utf8'
			);
			expect(kernelConfig).toContain("namespace: 'jobs-plugin'");
			expect(kernelConfig).toContain(
				'Kernel configuration for your project.'
			);

			const indexFile = await fs.readFile(
				path.join(workspace, 'src/index.ts'),
				'utf8'
			);
			expect(indexFile).toContain('bootstrapKernel');

			const tsconfig = JSON.parse(
				await fs.readFile(path.join(workspace, 'tsconfig.json'), 'utf8')
			);
			expect(tsconfig.compilerOptions).toMatchObject({
				moduleResolution: 'Bundler',
				strict: true,
				jsxImportSource: 'react',
			});
			expect(tsconfig.compilerOptions.paths).toEqual({
				'@/*': ['./src/*'],
			});
			expect(tsconfig.include).toEqual([
				'src/**/*',
				'.generated/types/**/*.d.ts',
				'kernel.config.ts',
			]);
			expect(tsconfig.exclude).toEqual(['node_modules', 'dist']);

			const jsconfig = JSON.parse(
				await fs.readFile(path.join(workspace, 'jsconfig.json'), 'utf8')
			);
			expect(jsconfig.compilerOptions).toMatchObject({
				baseUrl: '.',
				moduleResolution: 'Bundler',
			});
			expect(jsconfig.compilerOptions.paths).toEqual({
				'@/*': ['./src/*'],
			});
			expect(jsconfig.include).toEqual([
				'src/**/*',
				'.generated/types/**/*.d.ts',
				'kernel.config.ts',
			]);

			const packageJson = JSON.parse(
				await fs.readFile(path.join(workspace, 'package.json'), 'utf8')
			);
			expect(packageJson).toMatchObject({
				name: 'jobs-plugin',
				private: true,
				type: 'module',
				scripts: {
					start: 'wpk start',
					build: 'wpk build',
					generate: 'wpk generate',
					apply: 'wpk apply',
				},
				dependencies: {
					'@wpkernel/core': 'latest',
					'@wpkernel/ui': 'latest',
				},
			});
			expect(packageJson.peerDependencies).toMatchObject({
				react: expect.any(String),
				'react-dom': expect.any(String),
				'@wordpress/api-fetch': expect.any(String),
			});
			expect(packageJson.devDependencies).toEqual(
				expect.objectContaining({
					typescript: expect.any(String),
					vite: expect.any(String),
					'@types/react': expect.any(String),
					'@types/react-dom': expect.any(String),
				})
			);

			const composerJson = JSON.parse(
				await fs.readFile(path.join(workspace, 'composer.json'), 'utf8')
			);
			expect(composerJson).toMatchObject({
				name: 'jobs-plugin/jobs-plugin',
				autoload: {
					'psr-4': {
						'JobsPlugin\\': 'inc/',
					},
				},
			});

			await expect(
				fs.access(path.join(workspace, 'inc/.gitkeep'))
			).resolves.toBeUndefined();

			const viteConfig = await fs.readFile(
				path.join(workspace, 'vite.config.ts'),
				'utf8'
			);
			expect(viteConfig).toContain('defineConfig');
			expect(viteConfig).toContain("'react/jsx-runtime'");
		});
	});

	it('maps workspace source paths when run inside a pnpm monorepo', async () => {
		await withWorkspace(async (root) => {
			const repoRoot = path.join(root, 'monorepo');
			const workspace = path.join(repoRoot, 'examples', 'showcase');

			await fs.mkdir(workspace, { recursive: true });
			await fs.writeFile(
				path.join(repoRoot, 'pnpm-workspace.yaml'),
				'packages:\n  - packages/*\n',
				'utf8'
			);

			const packageNames = ['core', 'ui', 'cli', 'e2e-utils'];
			for (const packageName of packageNames) {
				const sourceDir = path.join(
					repoRoot,
					'packages',
					packageName,
					'src'
				);
				await fs.mkdir(sourceDir, { recursive: true });
				await fs.writeFile(
					path.join(sourceDir, 'index.ts'),
					'export {};\n',
					'utf8'
				);
			}

			await fs.mkdir(path.join(repoRoot, 'tests', 'test-utils'), {
				recursive: true,
			});

			const { command } = await createCommand(workspace);
			command.name = 'showcase-demo';

			const exit = await command.execute();

			expect(exit).toBe(WPK_EXIT_CODES.SUCCESS);

			const tsconfig = JSON.parse(
				await fs.readFile(path.join(workspace, 'tsconfig.json'), 'utf8')
			);

			expect(tsconfig.compilerOptions.paths).toEqual({
				'@/*': ['./src/*'],
				'@test-utils/*': ['../../tests/test-utils/*'],
				'@wpkernel/cli': ['../../packages/cli/src/index.ts'],
				'@wpkernel/cli/*': ['../../packages/cli/src/*'],
				'@wpkernel/core': ['../../packages/core/src/index.ts'],
				'@wpkernel/core/*': ['../../packages/core/src/*'],
				'@wpkernel/e2e-utils': [
					'../../packages/e2e-utils/src/index.ts',
				],
				'@wpkernel/e2e-utils/*': ['../../packages/e2e-utils/src/*'],
				'@wpkernel/ui': ['../../packages/ui/src/index.ts'],
				'@wpkernel/ui/*': ['../../packages/ui/src/*'],
			});

			const jsconfig = JSON.parse(
				await fs.readFile(path.join(workspace, 'jsconfig.json'), 'utf8')
			);
			expect(jsconfig.compilerOptions.paths).toEqual(
				tsconfig.compilerOptions.paths
			);
		});
	});

	it('aborts when scaffold targets already exist without --force', async () => {
		await withWorkspace(async (workspace) => {
			const { command, stderr } = await createCommand(workspace);
			command.name = 'jobs-plugin';

			await fs.writeFile(
				path.join(workspace, 'kernel.config.ts'),
				'// existing config',
				'utf8'
			);

			const exit = await command.execute();

			expect(exit).toBe(WPK_EXIT_CODES.VALIDATION_ERROR);
			const errors = stderr.toString();
			expect(errors).toContain('Refusing to overwrite existing files');
			expect(errors).toContain('kernel.config.ts');

			const kernelConfig = await fs.readFile(
				path.join(workspace, 'kernel.config.ts'),
				'utf8'
			);
			expect(kernelConfig).toBe('// existing config');
		});
	});

	it('overwrites files and scripts when --force is provided', async () => {
		await withWorkspace(async (workspace) => {
			const { command, stdout } = await createCommand(workspace);
			command.name = 'jobs-plugin';
			command.force = true;

			await fs.writeFile(
				path.join(workspace, 'kernel.config.ts'),
				'// stale config',
				'utf8'
			);

			await fs.writeFile(
				path.join(workspace, 'package.json'),
				JSON.stringify(
					{
						name: 'custom-package',
						scripts: {
							generate: 'custom generate',
							lint: 'eslint .',
						},
					},
					null,
					2
				)
			);

			const exit = await command.execute();

			expect(exit).toBe(WPK_EXIT_CODES.SUCCESS);
			const summary = stdout.toString();
			expect(summary).toContain('updated kernel.config.ts');
			expect(summary).toContain('updated package.json');

			const kernelConfig = await fs.readFile(
				path.join(workspace, 'kernel.config.ts'),
				'utf8'
			);
			expect(kernelConfig).toContain("namespace: 'jobs-plugin'");

			const packageJson = JSON.parse(
				await fs.readFile(path.join(workspace, 'package.json'), 'utf8')
			);
			expect(packageJson).toMatchObject({
				name: 'jobs-plugin',
				scripts: {
					start: 'wpk start',
					build: 'wpk build',
					generate: 'wpk generate',
					apply: 'wpk apply',
					lint: 'eslint .',
				},
				devDependencies: expect.objectContaining({
					vite: expect.any(String),
				}),
			});
		});
	});

	it('preserves custom peer dependency versions unless --force is provided', async () => {
		await withWorkspace(async (workspace) => {
			const { command } = await createCommand(workspace);
			command.name = 'jobs-plugin';

			await fs.writeFile(
				path.join(workspace, 'package.json'),
				JSON.stringify(
					{
						name: 'jobs-plugin',
						peerDependencies: {
							react: '^19.0.0-alpha',
							'@wordpress/data': 'canary-range',
						},
						devDependencies: {
							react: '^19.0.0-alpha',
							'@wordpress/data': 'canary-range',
						},
					},
					null,
					2
				)
			);

			const exit = await command.execute();

			expect(exit).toBe(WPK_EXIT_CODES.SUCCESS);

			const packageJson = JSON.parse(
				await fs.readFile(path.join(workspace, 'package.json'), 'utf8')
			);

			expect(packageJson.peerDependencies.react).toBe('^19.0.0-alpha');
			expect(packageJson.peerDependencies['@wordpress/data']).toBe(
				'canary-range'
			);
			expect(packageJson.devDependencies.react).toBe('^19.0.0-alpha');
			expect(packageJson.devDependencies['@wordpress/data']).toBe(
				'canary-range'
			);
		});
	});

	it('reports invalid package.json', async () => {
		await withWorkspace(async (workspace) => {
			const { command, stderr } = await createCommand(workspace);
			command.name = 'jobs-plugin';

			await fs.writeFile(
				path.join(workspace, 'package.json'),
				'{ invalid json',
				'utf8'
			);

			const exit = await command.execute();

			expect(exit).toBe(WPK_EXIT_CODES.VALIDATION_ERROR);
			const errors = stderr.toString();
			expect(errors).toContain('package.json is not valid JSON.');
			expect(errors).toContain('package.json');
		});
	});

	it('derives namespace defaults from the working directory name', async () => {
		await withWorkspace(async (root) => {
			const workspace = path.join(root, 'Fancy Plugin Suite');
			await fs.mkdir(workspace, { recursive: true });

			const { command } = await createCommand(workspace);

			const exit = await command.execute();

			expect(exit).toBe(WPK_EXIT_CODES.SUCCESS);

			const packageJson = JSON.parse(
				await fs.readFile(path.join(workspace, 'package.json'), 'utf8')
			);
			expect(packageJson.name).toBe('fancy-plugin-suite');

			const kernelConfig = await fs.readFile(
				path.join(workspace, 'kernel.config.ts'),
				'utf8'
			);
			expect(kernelConfig).toContain("namespace: 'fancy-plugin-suite'");

			const composerJson = JSON.parse(
				await fs.readFile(path.join(workspace, 'composer.json'), 'utf8')
			);
			expect(composerJson).toMatchObject({
				name: 'fancy-plugin-suite/fancy-plugin-suite',
				autoload: {
					'psr-4': {
						'FancyPluginSuite\\': 'inc/',
					},
				},
			});
		});
	});

	it('resolves templates when the bin wrapper provides a module URL handshake', async () => {
		await withWorkspace(async (workspace) => {
			const moduleUrl = pathToFileURL(
				path.join(__dirname, '../../..', 'dist/commands/init.js')
			).href;
			(
				globalThis as { __WPK_CLI_MODULE_URL__?: string }
			).__WPK_CLI_MODULE_URL__ = moduleUrl;

			const { command, stdout } = await createCommand(workspace, {
				resetModules: true,
			});

			const exit = await command.execute();

			expect(exit).toBe(WPK_EXIT_CODES.SUCCESS);
			const summary = stdout.toString();
			expect(summary).toContain('created kernel.config.ts');
		});
	});

	it('logs dependency resolution source when verbose and honours registry env flag', async () => {
		await withWorkspace(async (workspace) => {
			const originalEnv = process.env.WPK_PREFER_REGISTRY_VERSIONS;
			const originalRegistry = process.env.REGISTRY_URL;
			process.env.WPK_PREFER_REGISTRY_VERSIONS = '1';
			process.env.REGISTRY_URL = 'https://registry.example.com';

			let dependencySpy: jest.SpyInstance | undefined;

			try {
				const { command, stdout } = await createCommand(workspace, {
					resetModules: true,
					beforeImport: async () => {
						const dependencyModule = await import(
							'../init/dependency-versions'
						);
						dependencySpy = jest
							.spyOn(
								dependencyModule,
								'resolveDependencyVersions'
							)
							.mockResolvedValue({
								dependencies: {
									'@wpkernel/core': 'latest',
									'@wpkernel/ui': 'latest',
								},
								devDependencies: {},
								peerDependencies: {},
								source: 'registry',
								sources: ['fallback', 'registry'],
							});
					},
				});

				command.verbose = true;

				const exit = await command.execute();

				expect(exit).toBe(WPK_EXIT_CODES.SUCCESS);
				expect(stdout.toString()).toContain(
					'[wpk] init dependency versions resolved from registry'
				);

				expect(dependencySpy).toBeDefined();
				expect(dependencySpy?.mock.calls[0][1]).toMatchObject({
					preferRegistryVersions: true,
					registryUrl: 'https://registry.example.com',
				});
			} finally {
				dependencySpy?.mockRestore();
				if (originalEnv === undefined) {
					delete process.env.WPK_PREFER_REGISTRY_VERSIONS;
				} else {
					process.env.WPK_PREFER_REGISTRY_VERSIONS = originalEnv;
				}
				if (originalRegistry === undefined) {
					delete process.env.REGISTRY_URL;
				} else {
					process.env.REGISTRY_URL = originalRegistry;
				}
			}
		});
	});
});

async function withWorkspace(
	run: (workspace: string) => Promise<void>
): Promise<void> {
	await withTemporaryWorkspace(run, { prefix: TMP_PREFIX });
}

async function createCommand(
	workspace: string,
	options: {
		resetModules?: boolean;
		beforeImport?: () => Promise<void> | void;
	} = {}
): Promise<{
	command: InitCommand;
	stdout: ReturnType<typeof assignCommandContext>['stdout'];
	stderr: ReturnType<typeof assignCommandContext>['stderr'];
}> {
	if (options.resetModules === true) {
		jest.resetModules();
	}

	if (typeof options.beforeImport === 'function') {
		await options.beforeImport();
	}

	const { InitCommand } = await import('../init');
	const command = new InitCommand();
	const { stdout, stderr } = assignCommandContext(command, {
		cwd: workspace,
	});
	return { command, stdout, stderr };
}
