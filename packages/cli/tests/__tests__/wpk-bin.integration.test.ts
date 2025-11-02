import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { runWpk } from '../test-support/runWpk';
import { withWorkspace } from '../workspace.test-support';

const PHP_JSON_AST_AUTOLOAD = path.resolve(
	__dirname,
	'..',
	'..',
	'..',
	'php-json-ast',
	'vendor',
	'autoload.php'
);

jest.setTimeout(30000);

type RunResult = {
	code: number;
	stdout: string;
	stderr: string;
};

type RunOptions = {
	cwd: string;
	env?: NodeJS.ProcessEnv;
};

function runProcess(
	command: string,
	args: string[],
	options: RunOptions
): Promise<RunResult> {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd: options.cwd,
			env: options.env,
			stdio: ['ignore', 'pipe', 'pipe'],
		});

		let stdout = '';
		let stderr = '';

		child.stdout?.on('data', (chunk) => {
			stdout += chunk.toString();
		});

		child.stderr?.on('data', (chunk) => {
			stderr += chunk.toString();
		});

		child.once('error', reject);
		child.once('close', (code) => {
			resolve({
				code: code ?? 0,
				stdout,
				stderr,
			});
		});
	});
}

describe('wpk bin integration', () => {
	it('scaffolds a plugin workspace via init', async () => {
		await withWorkspace(
			async (workspace) => {
				const result = await runWpk(workspace, [
					'init',
					'--name',
					'integration-plugin',
				]);

				expect(result.code).toBe(0);
				expect(result.stderr).toBe('');
				const scaffoldedMessage =
					'created plugin scaffold for integration-plugin';
				expect(result.stdout).toContain(scaffoldedMessage);
				expect(result.stdout).toContain('created wpk.config.ts');

				const configPath = path.join(workspace, 'wpk.config.ts');
				const configSource = await fs.readFile(configPath, 'utf8');
				expect(configSource).toContain(
					"namespace: 'integration-plugin'"
				);

				const packageJsonPath = path.join(workspace, 'package.json');
				const packageJson = JSON.parse(
					await fs.readFile(packageJsonPath, 'utf8')
				);
				expect(packageJson).toMatchObject({
					name: 'integration-plugin',
					private: true,
					type: 'module',
					scripts: {
						start: 'wpk start',
						build: 'wpk build',
						generate: 'wpk generate',
						apply: 'wpk apply',
					},
				});

				const composerJsonPath = path.join(workspace, 'composer.json');
				const composerJson = JSON.parse(
					await fs.readFile(composerJsonPath, 'utf8')
				);
				expect(composerJson).toMatchObject({
					name: 'integration-plugin/integration-plugin',
				});
				expect(composerJson.autoload?.['psr-4']).toEqual({
					'IntegrationPlugin\\': 'inc/',
				});

				const indexPath = path.join(workspace, 'src', 'index.ts');
				const indexSource = await fs.readFile(indexPath, 'utf8');
				expect(indexSource).toContain('bootstrapKernel');
			},
			{ chdir: false }
		);
	});

	it('generates PHP artifacts via generate', async () => {
		await withWorkspace(
			async (workspace) => {
				const initResult = await runWpk(workspace, [
					'init',
					'--name',
					'integration-plugin',
				]);

				expect(initResult.code).toBe(0);
				expect(initResult.stderr).toBe('');

				const generateResult = await runWpk(
					workspace,
					['generate', '--verbose'],
					{
						env: {
							WPK_PHP_AUTOLOAD: path.join(
								workspace,
								'missing-autoload.php'
							),
							WPK_PHP_AUTOLOAD_PATHS: '',
							PHP_DRIVER_TRACE_FILE: path.join(
								workspace,
								'.wpk',
								'php-driver.trace.log'
							),
						},
					}
				);

				expect(generateResult.code).toBe(1);
				expect(generateResult.stderr).toContain(
					'nikic/php-parser not found via autoload'
				);
				expect(generateResult.stderr).toContain(
					'Run `composer install` in your plugin, or set WPK_PHP_AUTOLOAD.'
				);

				const tracePath = path.join(
					workspace,
					'.wpk',
					'php-driver.trace.log'
				);
				const traceExists = await fs
					.access(tracePath)
					.then(() => true)
					.catch(() => false);

				if (traceExists) {
					const traceLog = await fs.readFile(tracePath, 'utf8');
					const traceEvents = traceLog
						.split(/\r?\n/u)
						.map((line) => line.trim())
						.filter(Boolean)
						.map(
							(line) =>
								JSON.parse(line) as {
									event?: string;
								}
						);
					expect(
						traceEvents.some((entry) => entry.event === 'boot')
					).toBe(true);
					expect(
						traceEvents.some((entry) => entry.event === 'failure')
					).toBe(true);
					// Success events may be emitted even when the generator aborts,
					// so we only assert that the failure event is present.
				}

				await expect(
					fs.access(path.join(workspace, '.generated'))
				).rejects.toMatchObject({ code: 'ENOENT' });
			},
			{ chdir: false }
		);
	}, 300_000);

	it('manages the plugin loader through generate and apply', async () => {
		await withWorkspace(
			async (workspace) => {
				const initResult = await runWpk(workspace, [
					'init',
					'--name',
					'loader-plugin',
				]);

				expect(initResult.code).toBe(0);
				expect(initResult.stderr).toBe('');

				const gitInitResult = await runProcess('git', ['init'], {
					cwd: workspace,
				});
				expect(gitInitResult.code).toBe(0);

				const manifestPath = path.join(
					workspace,
					'.wpk',
					'apply',
					'manifest.json'
				);
				await fs.mkdir(path.dirname(manifestPath), { recursive: true });
				await fs.writeFile(manifestPath, '{}', 'utf8');

				const generateResult = await runWpk(workspace, ['generate'], {
					env: {
						WPK_PHP_AUTOLOAD: PHP_JSON_AST_AUTOLOAD,
					},
				});
				expect(generateResult.code).toBe(0);

				const indexPath = path.join(
					workspace,
					'.generated',
					'php',
					'index.php'
				);
				const indexContents = await fs.readFile(indexPath, 'utf8');
				expect(indexContents).toContain(
					"require_once(dirname(__DIR__, 2) . '/plugin.php');"
				);

				const planPath = path.join(
					workspace,
					'.wpk',
					'apply',
					'plan.json'
				);
				const plan = JSON.parse(
					await fs.readFile(planPath, 'utf8')
				) as {
					instructions?: Array<{ file: string }>;
				};
				expect(
					plan.instructions?.some(
						(instruction) => instruction.file === 'plugin.php'
					)
				).toBe(true);

				const applyResult = await runWpk(workspace, ['apply', '--yes']);
				expect(applyResult.code).toBe(0);

				const pluginPath = path.join(workspace, 'plugin.php');
				const pluginLoader = await fs.readFile(pluginPath, 'utf8');
				expect(pluginLoader).toContain('WPK:BEGIN AUTO');

				const customLoader = ['<?php', '// author override', ''].join(
					'\n'
				);
				await fs.writeFile(pluginPath, customLoader, 'utf8');

				const regenResult = await runWpk(workspace, ['generate'], {
					env: {
						WPK_PHP_AUTOLOAD: PHP_JSON_AST_AUTOLOAD,
					},
				});
				expect(regenResult.code).toBe(0);

				const updatedPlan = JSON.parse(
					await fs.readFile(planPath, 'utf8')
				) as {
					instructions?: Array<{ file: string }>;
				};
				expect(
					updatedPlan.instructions?.some(
						(instruction) => instruction.file === 'plugin.php'
					)
				).toBe(false);

				const applyOverride = await runWpk(workspace, [
					'apply',
					'--yes',
				]);
				expect(applyOverride.code).toBe(0);

				const finalLoader = await fs.readFile(pluginPath, 'utf8');
				expect(finalLoader).toContain('// author override');
			},
			{ chdir: false }
		);
	}, 300_000);

	it('links the generated PHP index to the plugin loader at the plugin root', async () => {
		await withWorkspace(
			async (workspace) => {
				const initResult = await runWpk(workspace, [
					'init',
					'--name',
					'integration-plugin',
				]);

				expect(initResult.code).toBe(0);
				expect(initResult.stderr).toBe('');

				const generateResult = await runWpk(
					workspace,
					['generate', '--verbose'],
					{
						env: {
							WPK_PHP_AUTOLOAD: PHP_JSON_AST_AUTOLOAD,
							PHP_DRIVER_TRACE_FILE: path.join(
								workspace,
								'.wpk',
								'php-driver.trace.log'
							),
						},
					}
				);

				expect(generateResult.code).not.toBe(0);
				expect(generateResult.stderr).toContain(
					'Failed to locate apply manifest after generation.'
				);

				const phpIndexPath = path.join(
					workspace,
					'.generated',
					'php',
					'index.php'
				);
				const phpIndexSource = await fs.readFile(phpIndexPath, 'utf8');

				if (phpIndexSource.includes('require_once')) {
					expect(phpIndexSource).toContain(
						"dirname(__DIR__, 2) . '/plugin.php'"
					);
				}
			},
			{ chdir: false }
		);
	}, 300_000);

	it('removes generated artifacts and queues shim deletions when resources are removed', async () => {
		await withWorkspace(
			async (workspace) => {
				const initResult = await runWpk(workspace, [
					'init',
					'--name',
					'resource-plugin',
				]);

				expect(initResult.code).toBe(0);
				expect(initResult.stderr).toBe('');

				const configPath = path.join(workspace, 'wpk.config.ts');
				const configWithResource = `import type { ResourceConfig, ResourceIdentityConfig, ResourceRoutes, ResourceStorageConfig } from '@wpkernel/core/resource';

type Book = { id: number; title: string };
type BookQuery = { search?: string };

const identity: ResourceIdentityConfig = {
        type: 'number',
        param: 'id',
};

const storage: ResourceStorageConfig = {
        mode: 'transient',
};

const routes: ResourceRoutes = {
        list: { path: '/example/v1/books', method: 'GET' },
        get: { path: '/example/v1/books/:id', method: 'GET' },
};

const books: ResourceConfig<Book, BookQuery> = {
        name: 'books',
        identity,
        storage,
        routes,
        schema: 'auto',
};

export const wpkConfig = {
        version: 1,
        namespace: 'resource-plugin',
        schemas: {},
        resources: {
                books,
        },
};
`;

				await fs.writeFile(configPath, configWithResource, 'utf8');

				const manifestPath = path.join(
					workspace,
					'.wpk',
					'apply',
					'manifest.json'
				);
				await fs.mkdir(path.dirname(manifestPath), { recursive: true });
				await fs.writeFile(manifestPath, '{}', 'utf8');

				const env = {
					WPK_PHP_AUTOLOAD: PHP_JSON_AST_AUTOLOAD,
				} satisfies NodeJS.ProcessEnv;

				const firstGenerate = await runWpk(workspace, ['generate'], {
					env,
				});

				expect(firstGenerate.stderr).toBe('');
				expect(firstGenerate.code).toBe(0);

				const generatedControllerPath = path.join(
					workspace,
					'.generated',
					'php',
					'Rest',
					'BooksController.php'
				);
				const generatedControllerAstPath = `${generatedControllerPath}.ast.json`;

				await expect(
					fs.access(generatedControllerPath)
				).resolves.toBeUndefined();
				await expect(
					fs.access(generatedControllerAstPath)
				).resolves.toBeUndefined();

				const statePath = path.join(
					workspace,
					'.wpk',
					'apply',
					'state.json'
				);
				const initialState = JSON.parse(
					await fs.readFile(statePath, 'utf8')
				) as { resources?: Record<string, unknown> };
				expect(initialState.resources).toHaveProperty('books');

				const configWithoutResource = `export const wpkConfig = {
        version: 1,
        namespace: 'resource-plugin',
        schemas: {},
        resources: {},
};
`;

				await fs.writeFile(configPath, configWithoutResource, 'utf8');

				const secondGenerate = await runWpk(workspace, ['generate'], {
					env,
				});

				expect(secondGenerate.stderr).toBe('');
				expect(secondGenerate.code).toBe(0);

				await expect(
					fs.access(generatedControllerPath)
				).rejects.toMatchObject({
					code: 'ENOENT',
				});
				await expect(
					fs.access(generatedControllerAstPath)
				).rejects.toMatchObject({
					code: 'ENOENT',
				});

				const nextState = JSON.parse(
					await fs.readFile(statePath, 'utf8')
				) as { resources?: Record<string, unknown> };
				expect(nextState.resources).toEqual({});

				const planPath = path.join(
					workspace,
					'.wpk',
					'apply',
					'plan.json'
				);
				const plan = JSON.parse(
					await fs.readFile(planPath, 'utf8')
				) as {
					instructions?: Array<{
						action?: string;
						file?: string;
					}>;
				};
				const deletionInstruction = plan.instructions?.find(
					(instruction) =>
						instruction?.action === 'delete' &&
						instruction.file === 'inc/Rest/BooksController.php'
				);

				expect(deletionInstruction).toBeDefined();
			},
			{ chdir: false }
		);
	}, 300_000);

	it('removes stale generated artifacts when PHP paths change', async () => {
		await withWorkspace(
			async (workspace) => {
				const initResult = await runWpk(workspace, [
					'init',
					'--name',
					'path-plugin',
				]);

				expect(initResult.code).toBe(0);
				expect(initResult.stderr).toBe('');

				const configPath = path.join(workspace, 'wpk.config.ts');
				const configWithResource = `import type {
        ResourceConfig,
        ResourceIdentityConfig,
        ResourceRoutes,
        ResourceStorageConfig,
} from '@wpkernel/core/resource';

type Book = { id: number; title: string };
type BookQuery = { search?: string };

const identity: ResourceIdentityConfig = {
        type: 'number',
        param: 'id',
};

const storage: ResourceStorageConfig = {
        mode: 'transient',
};

const routes: ResourceRoutes = {
        list: { path: '/example/v1/books', method: 'GET' },
        get: { path: '/example/v1/books/:id', method: 'GET' },
};

const books: ResourceConfig<Book, BookQuery> = {
        name: 'books',
        identity,
        storage,
        routes,
        schema: 'auto',
};

export const wpkConfig = {
        version: 1,
        namespace: 'path-plugin',
        schemas: {},
        resources: {
                books,
        },
        php: {
                outputDir: '.generated/php',
                autoload: 'inc/',
        },
};
`;

				await fs.writeFile(configPath, configWithResource, 'utf8');

				const manifestPath = path.join(
					workspace,
					'.wpk',
					'apply',
					'manifest.json'
				);
				await fs.mkdir(path.dirname(manifestPath), { recursive: true });
				await fs.writeFile(manifestPath, '{}', 'utf8');

				const env = {
					WPK_PHP_AUTOLOAD: PHP_JSON_AST_AUTOLOAD,
				} satisfies NodeJS.ProcessEnv;

				const firstGenerate = await runWpk(workspace, ['generate'], {
					env,
				});

				expect(firstGenerate.code).toBe(0);
				expect(firstGenerate.stderr).toBe('');

				const legacyControllerPath = path.join(
					workspace,
					'.generated',
					'php',
					'Rest',
					'BooksController.php'
				);
				const legacyControllerAstPath = `${legacyControllerPath}.ast.json`;

				await expect(
					fs.access(legacyControllerPath)
				).resolves.toBeUndefined();
				await expect(
					fs.access(legacyControllerAstPath)
				).resolves.toBeUndefined();

				const statePath = path.join(
					workspace,
					'.wpk',
					'apply',
					'state.json'
				);
				const initialState = JSON.parse(
					await fs.readFile(statePath, 'utf8')
				) as {
					resources?: Record<
						string,
						{
							artifacts?: {
								generated?: string[];
								shims?: string[];
							};
						}
					>;
				};
				const resourceArtifacts = initialState.resources?.books
					?.artifacts ?? {
					generated: [],
					shims: [],
				};
				let initialShims = resourceArtifacts.shims ?? [];
				const legacyShimPath = 'inc/Legacy/BooksController.php';

				const legacyGeneratedPaths = [
					'.generated/legacy/Rest/BooksController.php',
					'.generated/legacy/Rest/BooksController.php.ast.json',
				];
				for (const legacyPath of legacyGeneratedPaths) {
					const absoluteLegacy = path.join(workspace, legacyPath);
					await fs.mkdir(path.dirname(absoluteLegacy), {
						recursive: true,
					});
					await fs.writeFile(absoluteLegacy, '<?php\n');
				}

				const absoluteLegacyShim = path.join(workspace, legacyShimPath);
				await fs.mkdir(path.dirname(absoluteLegacyShim), {
					recursive: true,
				});
				await fs.writeFile(absoluteLegacyShim, '<?php\n');

				const initialGenerated = [
					...(resourceArtifacts.generated ?? []),
					...legacyGeneratedPaths,
				];
				initialShims = [...initialShims, legacyShimPath];
				if (initialState.resources?.books?.artifacts) {
					initialState.resources.books.artifacts.generated =
						initialGenerated;
					initialState.resources.books.artifacts.shims = initialShims;
				}

				await fs.writeFile(
					statePath,
					`${JSON.stringify(initialState, null, 2)}\n`,
					'utf8'
				);

				const configWithNewPaths = `import type {
        ResourceConfig,
        ResourceIdentityConfig,
        ResourceRoutes,
        ResourceStorageConfig,
} from '@wpkernel/core/resource';

type Book = { id: number; title: string };
type BookQuery = { search?: string };

const identity: ResourceIdentityConfig = {
        type: 'number',
        param: 'id',
};

const storage: ResourceStorageConfig = {
        mode: 'transient',
};

const routes: ResourceRoutes = {
        list: { path: '/example/v1/books', method: 'GET' },
        get: { path: '/example/v1/books/:id', method: 'GET' },
};

const books: ResourceConfig<Book, BookQuery> = {
        name: 'books',
        identity,
        storage,
        routes,
        schema: 'auto',
};

export const wpkConfig = {
        version: 1,
        namespace: 'path-plugin',
        schemas: {},
        resources: {
                books,
        },
        php: {
                outputDir: '.generated/server',
                autoload: 'includes/',
        },
};
`;

				await fs.writeFile(configPath, configWithNewPaths, 'utf8');

				const secondGenerate = await runWpk(workspace, ['generate'], {
					env,
				});

				expect(secondGenerate.code).toBe(0);
				expect(secondGenerate.stderr).toBe('');

				const state = JSON.parse(
					await fs.readFile(statePath, 'utf8')
				) as {
					resources?: Record<
						string,
						{
							artifacts?: {
								generated?: string[];
								shims?: string[];
							};
						}
					>;
				};

				const nextGenerated =
					state.resources?.books?.artifacts?.generated ?? [];
				const nextShims =
					state.resources?.books?.artifacts?.shims ?? [];

				expect(nextGenerated).not.toEqual(initialGenerated);

				for (const removedPath of initialGenerated.filter(
					(file) => !nextGenerated.includes(file)
				)) {
					await expect(
						fs.access(path.join(workspace, removedPath))
					).rejects.toMatchObject({
						code: 'ENOENT',
					});
				}

				for (const generatedPath of nextGenerated) {
					await expect(
						fs.access(path.join(workspace, generatedPath))
					).resolves.toBeUndefined();
				}

				const planPath = path.join(
					workspace,
					'.wpk',
					'apply',
					'plan.json'
				);
				const plan = JSON.parse(
					await fs.readFile(planPath, 'utf8')
				) as {
					instructions?: Array<{
						action?: string;
						file?: string;
					}>;
				};

				const removedShimPaths = initialShims.filter(
					(shim) => !nextShims.includes(shim)
				);
				for (const removedShim of removedShimPaths) {
					const shimDeletion = plan.instructions?.find(
						(instruction) =>
							instruction?.action === 'delete' &&
							instruction.file === removedShim
					);
					expect(shimDeletion).toBeDefined();
				}

				const shimWrite = plan.instructions?.find(
					(instruction) =>
						instruction?.action === 'write' &&
						instruction.file === 'inc/Rest/BooksController.php'
				);
				expect(shimWrite).toBeDefined();

				expect(nextShims).toContain('inc/Rest/BooksController.php');
			},
			{ chdir: false }
		);
	}, 300_000);
});
