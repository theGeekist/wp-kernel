import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import type { BaseContext } from 'clipanion';
import type { InitCommand } from '../init';
import { WPK_EXIT_CODES } from '@wpkernel/core/contracts';

const TMP_PREFIX = path.join(os.tmpdir(), 'wpk-init-command-');

describe('InitCommand', () => {
	afterEach(() => {
		delete (globalThis as { __WPK_CLI_MODULE_URL__?: string })
			.__WPK_CLI_MODULE_URL__;
		jest.resetModules();
	});

	it('scaffolds project files with recommended defaults', async () => {
		await withWorkspace(async (workspace) => {
			const command = await createCommand(workspace);
			command.name = 'jobs-plugin';

			const exit = await command.execute();

			expect(exit).toBe(WPK_EXIT_CODES.SUCCESS);
			const stdout = command.context.stdout.toString();
			expect(stdout).toContain('created plugin scaffold for jobs-plugin');
			expect(stdout).toContain('created kernel.config.ts');
			expect(stdout).toContain('created src/index.ts');
			expect(stdout).toContain('created tsconfig.json');
			expect(stdout).toContain('created eslint.config.js');
			expect(stdout).toContain('created vite.config.ts');
			expect(stdout).toContain('created package.json');
			expect(stdout).toContain('created composer.json');
			expect(stdout).toContain('created inc/.gitkeep');

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
			});

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

	it('aborts when scaffold targets already exist without --force', async () => {
		await withWorkspace(async (workspace) => {
			const command = await createCommand(workspace);
			command.name = 'jobs-plugin';

			await fs.writeFile(
				path.join(workspace, 'kernel.config.ts'),
				'// existing config',
				'utf8'
			);

			const exit = await command.execute();

			expect(exit).toBe(WPK_EXIT_CODES.VALIDATION_ERROR);
			const stderr = command.context.stderr.toString();
			expect(stderr).toContain('Refusing to overwrite existing files');
			expect(stderr).toContain('kernel.config.ts');

			const kernelConfig = await fs.readFile(
				path.join(workspace, 'kernel.config.ts'),
				'utf8'
			);
			expect(kernelConfig).toBe('// existing config');
		});
	});

	it('overwrites files and scripts when --force is provided', async () => {
		await withWorkspace(async (workspace) => {
			const command = await createCommand(workspace);
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
			const stdout = command.context.stdout.toString();
			expect(stdout).toContain('updated kernel.config.ts');
			expect(stdout).toContain('updated package.json');

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
			const command = await createCommand(workspace);
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
			const command = await createCommand(workspace);
			command.name = 'jobs-plugin';

			await fs.writeFile(
				path.join(workspace, 'package.json'),
				'{ invalid json',
				'utf8'
			);

			const exit = await command.execute();

			expect(exit).toBe(WPK_EXIT_CODES.VALIDATION_ERROR);
			const stderr = command.context.stderr.toString();
			expect(stderr).toContain('package.json is not valid JSON.');
			expect(stderr).toContain('package.json');
		});
	});

	it('derives namespace defaults from the working directory name', async () => {
		await withWorkspace(async (root) => {
			const workspace = path.join(root, 'Fancy Plugin Suite');
			await fs.mkdir(workspace, { recursive: true });

			const command = await createCommand(workspace);

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

			const command = await createCommand(workspace, {
				resetModules: true,
			});

			const exit = await command.execute();

			expect(exit).toBe(WPK_EXIT_CODES.SUCCESS);
			const stdout = command.context.stdout.toString();
			expect(stdout).toContain('created kernel.config.ts');
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
				const command = await createCommand(workspace, {
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
				expect(command.context.stdout.toString()).toContain(
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
	const workspace = await fs.mkdtemp(TMP_PREFIX);
	try {
		const original = process.cwd();
		process.chdir(workspace);
		try {
			await run(workspace);
		} finally {
			process.chdir(original);
		}
	} finally {
		await fs.rm(workspace, { recursive: true, force: true });
	}
}

async function createCommand(
	workspace: string,
	options: {
		resetModules?: boolean;
		beforeImport?: () => Promise<void> | void;
	} = {}
): Promise<InitCommand> {
	if (options.resetModules === true) {
		jest.resetModules();
	}

	if (typeof options.beforeImport === 'function') {
		await options.beforeImport();
	}

	const { InitCommand } = await import('../init');
	const command = new InitCommand();
	command.context = {
		stdout: new MemoryStream(),
		stderr: new MemoryStream(),
		stdin: process.stdin,
		env: process.env,
		cwd: () => workspace,
		colorDepth: 1,
	} as BaseContext;
	return command;
}

class MemoryStream {
	private readonly chunks: string[] = [];

	write(chunk: string): void {
		this.chunks.push(chunk);
	}

	toString(): string {
		return this.chunks.join('');
	}
}
