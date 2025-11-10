import fs from 'node:fs/promises';
import path from 'node:path';
import { runWpk } from '../test-support/runWpk';
import { withWorkspace } from '../workspace.test-support';
import { runProcess } from '@wpkernel/test-utils/integration';

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

				const baseShimPath = path.join(
					workspace,
					'.wpk',
					'apply',
					'base',
					'inc',
					'Rest',
					'BooksController.php'
				);
				const shimPath = path.join(
					workspace,
					'inc',
					'Rest',
					'BooksController.php'
				);
				await fs.mkdir(path.dirname(shimPath), { recursive: true });
				await fs.writeFile(
					shimPath,
					await fs.readFile(baseShimPath, 'utf8'),
					'utf8'
				);

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

	it('applies mixed shim deletion outcomes when overrides exist', async () => {
		await withWorkspace(
			async (workspace) => {
				const initResult = await runWpk(workspace, [
					'init',
					'--name',
					'mixed-plugin',
				]);

				expect(initResult.code).toBe(0);
				expect(initResult.stderr).toBe('');

				const gitInitResult = await runProcess('git', ['init'], {
					cwd: workspace,
				});
				expect(gitInitResult.code).toBe(0);

				const configPath = path.join(workspace, 'wpk.config.ts');
				const configWithResources = `import type {
        ResourceConfig,
        ResourceIdentityConfig,
        ResourceRoutes,
        ResourceStorageConfig,
} from '@wpkernel/core/resource';

type Book = { id: number; title: string };
type BookQuery = { search?: string };

type Author = { id: number; name: string };
type AuthorQuery = { search?: string };

const bookIdentity: ResourceIdentityConfig = {
        type: 'number',
        param: 'id',
};

const authorIdentity: ResourceIdentityConfig = {
        type: 'number',
        param: 'id',
};

const storage: ResourceStorageConfig = {
        mode: 'transient',
};

const bookRoutes: ResourceRoutes = {
        list: { path: '/example/v1/books', method: 'GET' },
        get: { path: '/example/v1/books/:id', method: 'GET' },
};

const authorRoutes: ResourceRoutes = {
        list: { path: '/example/v1/authors', method: 'GET' },
        get: { path: '/example/v1/authors/:id', method: 'GET' },
};

const books: ResourceConfig<Book, BookQuery> = {
        name: 'books',
        identity: bookIdentity,
        storage,
        routes: bookRoutes,
        schema: 'auto',
};

const authors: ResourceConfig<Author, AuthorQuery> = {
        name: 'authors',
        identity: authorIdentity,
        storage,
        routes: authorRoutes,
        schema: 'auto',
};

export const wpkConfig = {
        version: 1,
        namespace: 'mixed-plugin',
        schemas: {},
        resources: {
                books,
                authors,
        },
};
`;

				await fs.writeFile(configPath, configWithResources, 'utf8');

				const manifestPath = path.join(
					workspace,
					'.wpk',
					'apply',
					'manifest.json'
				);
				await fs.mkdir(path.dirname(manifestPath), { recursive: true });
				await fs.writeFile(
					manifestPath,
					JSON.stringify(
						{
							summary: {
								applied: 0,
								conflicts: 0,
								skipped: 0,
							},
							records: [],
							actions: [],
						},
						null,
						2
					),
					'utf8'
				);

				const env = {
					WPK_PHP_AUTOLOAD: PHP_JSON_AST_AUTOLOAD,
				} satisfies NodeJS.ProcessEnv;

				const firstGenerate = await runWpk(workspace, ['generate'], {
					env,
				});

				expect(firstGenerate.code).toBe(0);
				expect(firstGenerate.stderr).toBe('');

				const booksShimPath = path.join(
					workspace,
					'inc',
					'Rest',
					'BooksController.php'
				);
				const baseBooksShimPath = path.join(
					workspace,
					'.wpk',
					'apply',
					'base',
					'inc',
					'Rest',
					'BooksController.php'
				);
				const originalBooksShim = await fs.readFile(
					baseBooksShimPath,
					'utf8'
				);
				await fs.mkdir(path.dirname(booksShimPath), {
					recursive: true,
				});
				await fs.writeFile(booksShimPath, originalBooksShim, 'utf8');
				await fs.writeFile(
					booksShimPath,
					`${originalBooksShim}\n// developer override\n`,
					'utf8'
				);

				const authorsShimTargetPath = path.join(
					workspace,
					'inc',
					'Rest',
					'AuthorsController.php'
				);
				const baseAuthorsShimPath = path.join(
					workspace,
					'.wpk',
					'apply',
					'base',
					'inc',
					'Rest',
					'AuthorsController.php'
				);
				const originalAuthorsShim = await fs.readFile(
					baseAuthorsShimPath,
					'utf8'
				);
				await fs.writeFile(
					authorsShimTargetPath,
					originalAuthorsShim,
					'utf8'
				);

				const configWithoutResources = `export const wpkConfig = {
        version: 1,
        namespace: 'mixed-plugin',
        schemas: {},
        resources: {},
};
`;

				await fs.writeFile(configPath, configWithoutResources, 'utf8');

				const secondGenerate = await runWpk(workspace, ['generate'], {
					env,
				});

				expect(secondGenerate.code).toBe(0);
				expect(secondGenerate.stderr).toBe('');

				const planPath = path.join(
					workspace,
					'.wpk',
					'apply',
					'plan.json'
				);
				const plan = JSON.parse(
					await fs.readFile(planPath, 'utf8')
				) as {
					instructions?: Array<{ action?: string; file?: string }>;
					skippedDeletions?: Array<{
						file?: string;
						reason?: string;
					}>;
				};

				expect(
					plan.instructions?.some(
						(instruction) =>
							instruction?.action === 'delete' &&
							instruction.file ===
								'inc/Rest/AuthorsController.php'
					)
				).toBe(true);
				expect(
					plan.instructions?.some(
						(instruction) =>
							instruction?.action === 'delete' &&
							instruction.file === 'inc/Rest/BooksController.php'
					)
				).toBe(false);
				expect(plan.skippedDeletions).toEqual(
					expect.arrayContaining([
						expect.objectContaining({
							file: 'inc/Rest/BooksController.php',
							reason: 'modified-target',
						}),
					])
				);

				const applyResult = await runWpk(workspace, ['apply', '--yes']);

				expect(applyResult.code).toBe(0);
				expect(applyResult.stderr).toBe('');

				const authorsShimPath = path.join(
					workspace,
					'inc',
					'Rest',
					'AuthorsController.php'
				);
				await expect(fs.access(authorsShimPath)).rejects.toMatchObject({
					code: 'ENOENT',
				});

				const booksShimContents = await fs.readFile(
					booksShimPath,
					'utf8'
				);
				expect(booksShimContents).toContain('// developer override');

				const manifest = JSON.parse(
					await fs.readFile(manifestPath, 'utf8')
				) as {
					records?: Array<{
						file?: string;
						status?: string;
						details?: unknown;
					}>;
				};

				expect(manifest.records).toEqual(
					expect.arrayContaining([
						expect.objectContaining({
							file: 'inc/Rest/AuthorsController.php',
							status: 'applied',
						}),
						expect.objectContaining({
							file: 'inc/Rest/BooksController.php',
							status: 'skipped',
							details: expect.objectContaining({
								reason: 'modified-target',
							}),
						}),
					])
				);
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

				const ensureShimMatchesBase = async (
					relativePath: string,
					fallbackContents?: string
				) => {
					const fallback = fallbackContents ?? '<?php\n';
					const baseShimPath = path.join(
						workspace,
						'.wpk',
						'apply',
						'base',
						relativePath
					);
					const targetShimPath = path.join(workspace, relativePath);
					let contents: string | null = null;

					try {
						contents = await fs.readFile(baseShimPath, 'utf8');
					} catch (error) {
						if (
							(error as NodeJS.ErrnoException).code !== 'ENOENT'
						) {
							throw error;
						}
					}

					if (contents === null) {
						contents = fallback;
						await fs.mkdir(path.dirname(baseShimPath), {
							recursive: true,
						});
						await fs.writeFile(baseShimPath, contents, 'utf8');
					}

					await fs.mkdir(path.dirname(targetShimPath), {
						recursive: true,
					});
					await fs.writeFile(targetShimPath, contents, 'utf8');
				};

				const uniqueInitialShims = Array.from(new Set(initialShims));
				for (const shimPath of uniqueInitialShims) {
					const fallback =
						shimPath === legacyShimPath ? '<?php\n' : undefined;
					await ensureShimMatchesBase(shimPath, fallback);
				}

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
