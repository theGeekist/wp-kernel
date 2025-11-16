import type { Workspace } from '../../workspace';
import type { IRResource } from '../../ir/publicTypes';
import type { SerializableResourceUIConfig } from '../../config/types';
import { makeIr, makeIrMeta } from '../../../tests/ir.test-support';
import {
	buildEmptyGenerationState,
	buildGenerationManifestFromIr,
	diffGenerationState,
	GENERATION_STATE_PATH,
	normaliseGenerationState,
	readGenerationState,
	writeGenerationState,
	type GenerationManifest,
} from '../manifest';

describe('generation manifest helpers', () => {
	function createWorkspaceMock(
		overrides: Partial<Workspace> = {}
	): Workspace {
		const workspace: Partial<Workspace> = {
			readText: jest.fn(async () => null),
			writeJson: jest.fn(async () => undefined),
			...overrides,
		};

		return workspace as Workspace;
	}

	it('returns an empty state when the manifest file is missing', async () => {
		const workspace = createWorkspaceMock();
		const result = await readGenerationState(workspace);

		expect(result).toEqual(buildEmptyGenerationState());
		expect(workspace.readText).toHaveBeenCalledWith(GENERATION_STATE_PATH);
	});

	it('normalises manifest contents from disk', async () => {
		const workspace = createWorkspaceMock({
			readText: jest.fn(async () =>
				JSON.stringify({
					version: 1,
					resources: {
						books: {
							hash: 'abc123',
							artifacts: {
								generated: [
									'.generated\\php\\Rest\\BooksController.php',
									'./.generated/php/Rest/BooksController.php.ast.json',
									'',
									42,
								],
								shims: [
									'inc/Rest/BooksController.php',
									'inc\\Rest\\BooksController.php',
									null,
								],
							},
						},
						invalid: {
							artifacts: {
								generated: ['.generated/php/Rest/Invalid.php'],
							},
						},
					},
					pluginLoader: {
						file: './plugin.php',
						ast: 'plugin.php.ast.json',
					},
					phpIndex: {
						file: '.generated/php/index.php',
						ast: './.generated/php/index.php.ast.json',
					},
					ui: {
						handle: 'wp-demo-plugin-ui',
					},
				})
			),
		});

		const result = await readGenerationState(workspace);

		expect(result).toEqual({
			version: 1,
			resources: {
				books: {
					hash: 'abc123',
					artifacts: {
						generated: [
							'.generated/php/Rest/BooksController.php',
							'.generated/php/Rest/BooksController.php.ast.json',
						],
						shims: ['inc/Rest/BooksController.php'],
					},
				},
			},
			pluginLoader: {
				file: 'plugin.php',
				ast: 'plugin.php.ast.json',
			},
			phpIndex: {
				file: '.generated/php/index.php',
				ast: '.generated/php/index.php.ast.json',
			},
			ui: {
				handle: 'wp-demo-plugin-ui',
			},
		});
	});

	it('returns an empty state when parsing invalid structures', () => {
		const malformed = normaliseGenerationState({ version: 2 });
		expect(malformed).toEqual(buildEmptyGenerationState());
	});

	it('throws when the state file contains invalid JSON', async () => {
		const workspace = createWorkspaceMock({
			readText: jest.fn(async () => '{'),
		});

		await expect(readGenerationState(workspace)).rejects.toMatchObject({
			message: 'Failed to parse generation state JSON.',
		});
	});

	it('writes the manifest back to disk with pretty formatting', async () => {
		const workspace = createWorkspaceMock();
		const state = {
			version: 1,
			resources: {},
		} as const;

		await writeGenerationState(workspace, state);

		expect(workspace.writeJson).toHaveBeenCalledWith(
			GENERATION_STATE_PATH,
			state,
			{ pretty: true }
		);
	});

	it('builds a manifest from an IR artifact', () => {
		const dataviewsConfig = {
			fields: [{ id: 'title', label: 'Title' }],
			defaultView: { type: 'table', fields: ['title'] },
			preferencesKey: 'books/admin',
		};
		const uiConfig: SerializableResourceUIConfig = {
			admin: {
				dataviews: dataviewsConfig,
			},
		};
		const resource: IRResource = {
			id: 'res:books',
			name: 'books',
			schemaKey: 'books',
			schemaProvenance: 'manual',
			routes: [],
			cacheKeys: {
				list: { segments: [], source: 'default' },
				get: { segments: [], source: 'default' },
			},
			warnings: [],
			hash: {
				algo: 'sha256',
				inputs: ['resource'],
				value: 'abc123',
			},
			ui: uiConfig,
		};

		const manifest = buildGenerationManifestFromIr(
			makeIr({
				namespace: 'demo-plugin',
				meta: makeIrMeta('demo-plugin', {
					sourcePath: 'wpk.config.ts',
					origin: 'typescript',
					features: ['capabilityMap', 'blocks', 'phpAutoload'],
					redactions: ['config.env', 'adapters.secrets'],
					limits: {
						maxConfigKB: 256,
						maxSchemaKB: 1024,
						policy: 'truncate',
					},
				}),
				config: {
					resources: {
						books: {
							name: 'books',
							schema: 'auto',
							routes: {},
							cacheKeys: undefined,
							ui: uiConfig,
						},
					},
					schemas: {},
				},
				schemas: [],
				resources: [resource],
				capabilities: [],
				capabilityMap: {
					definitions: [],
					fallback: {
						capability: 'manage_demo',
						appliesTo: 'resource',
					},
					missing: [],
					unused: [],
					warnings: [],
				},
				blocks: [],
				php: {
					namespace: 'DemoPlugin',
					autoload: 'inc/',
					outputDir: '.generated/php',
				},
				diagnostics: [],
			})
		);

		expect(manifest.resources.books).toEqual({
			hash: 'abc123',
			artifacts: {
				generated: expect.arrayContaining([
					'.generated/php/Rest/BooksController.php',
					'.generated/php/Rest/BooksController.php.ast.json',
					'.generated/ui/fixtures/dataviews/books.ts',
					'.generated/ui/fixtures/interactivity/books.ts',
					'.generated/ui/registry/dataviews/books.ts',
				]),
				shims: ['inc/Rest/BooksController.php'],
			},
		});
		expect(manifest.pluginLoader).toEqual({
			file: 'plugin.php',
			ast: 'plugin.php.ast.json',
		});
		expect(manifest.phpIndex).toEqual({
			file: '.generated/php/index.php',
			ast: '.generated/php/index.php.ast.json',
		});
		expect(manifest.ui).toEqual({ handle: 'wp-demo-plugin-ui' });
	});

	it('returns an empty manifest when IR is null', () => {
		const manifest = buildGenerationManifestFromIr(null);
		expect(manifest).toEqual(buildEmptyGenerationState());
	});

	it('omits resources that cannot be normalised to PascalCase', () => {
		const manifest = buildGenerationManifestFromIr({
			meta: makeIrMeta('DemoPlugin', {
				sourcePath: 'wpk.config.ts',
				origin: 'typescript',
			}),
			config: {
				version: 1,
				namespace: 'DemoPlugin',
				resources: {},
				schemas: {},
			},
			schemas: [],
			resources: [
				{
					id: 'res:ignored',
					name: '---',
					schemaKey: 'ignored',
					schemaProvenance: 'manual',
					routes: [],
					cacheKeys: {
						list: { segments: [], source: 'default' },
						get: { segments: [], source: 'default' },
					},
					warnings: [],
					hash: {
						algo: 'sha256',
						inputs: ['resource'],
						value: 'bad',
					},
				},
			],
			capabilities: [],
			capabilityMap: {
				definitions: [],
				fallback: { capability: 'manage_demo', appliesTo: 'resource' },
				missing: [],
				unused: [],
				warnings: [],
			},
			blocks: [],
			php: {
				namespace: 'DemoPlugin',
				autoload: 'inc/',
				outputDir: '.generated/php',
			},
			diagnostics: [],
		});

		expect(manifest.resources).toEqual({});
	});

	it('diffs manifests to capture removed resources', () => {
		const previous = {
			version: 1 as const,
			resources: {
				books: {
					hash: 'abc123',
					artifacts: {
						generated: ['.generated/php/Rest/BooksController.php'],
						shims: ['inc/Rest/BooksController.php'],
					},
				},
			},
		};
		const next = {
			version: 1 as const,
			resources: {},
		};

		const diff = diffGenerationState(previous, next);
		expect(diff.removed).toEqual([
			{
				resource: 'books',
				generated: ['.generated/php/Rest/BooksController.php'],
				shims: ['inc/Rest/BooksController.php'],
			},
		]);
	});

	it('diffs manifests without removals when resources persist', () => {
		const previous = {
			version: 1 as const,
			resources: {
				books: {
					hash: 'abc123',
					artifacts: {
						generated: ['.generated/php/Rest/BooksController.php'],
						shims: ['inc/Rest/BooksController.php'],
					},
				},
			},
		} satisfies GenerationManifest;
		const next = {
			version: 1 as const,
			resources: {
				books: {
					hash: 'def456',
					artifacts: {
						generated: ['.generated/php/Rest/BooksController.php'],
						shims: ['inc/Rest/BooksController.php'],
					},
				},
			},
		} satisfies GenerationManifest;

		const diff = diffGenerationState(previous, next);
		expect(diff.removed).toEqual([]);
	});

	it('diffs manifests when generated artifact paths change', () => {
		const previous = {
			version: 1 as const,
			resources: {
				books: {
					hash: 'abc123',
					artifacts: {
						generated: [
							'.generated/php/Rest/BooksController.php',
							'.generated/php/Rest/BooksController.php.ast.json',
						],
						shims: ['inc/Rest/BooksController.php'],
					},
				},
			},
		} satisfies GenerationManifest;

		const next = {
			version: 1 as const,
			resources: {
				books: {
					hash: 'def456',
					artifacts: {
						generated: [
							'.generated/server/Rest/BooksController.php',
							'.generated/server/Rest/BooksController.php.ast.json',
						],
						shims: ['inc/Rest/BooksController.php'],
					},
				},
			},
		} satisfies GenerationManifest;

		const diff = diffGenerationState(previous, next);
		expect(diff.removed).toEqual([
			{
				resource: 'books',
				generated: [
					'.generated/php/Rest/BooksController.php',
					'.generated/php/Rest/BooksController.php.ast.json',
				],
				shims: [],
			},
		]);
	});

	it('diffs manifests when shim paths change', () => {
		const previous = {
			version: 1 as const,
			resources: {
				books: {
					hash: 'abc123',
					artifacts: {
						generated: ['.generated/php/Rest/BooksController.php'],
						shims: ['inc/Rest/BooksController.php'],
					},
				},
			},
		} satisfies GenerationManifest;

		const next = {
			version: 1 as const,
			resources: {
				books: {
					hash: 'def456',
					artifacts: {
						generated: ['.generated/php/Rest/BooksController.php'],
						shims: ['includes/Rest/BooksController.php'],
					},
				},
			},
		} satisfies GenerationManifest;

		const diff = diffGenerationState(previous, next);
		expect(diff.removed).toEqual([
			{
				resource: 'books',
				generated: [],
				shims: ['inc/Rest/BooksController.php'],
			},
		]);
	});
});
