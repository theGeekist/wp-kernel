import { deriveResourceBlocks } from '../shared.blocks.derived';
import type {
	IRBlock,
	IRHashProvenance,
	IRResource,
	IRResourceCacheKey,
	IRRoute,
	IRSchema,
	IRv1,
} from '../../ir/publicTypes';
import type { WPKernelConfigV1 } from '../../config/types';

describe('deriveResourceBlocks', () => {
	it('derives manifest attributes from schema definitions', () => {
		const schemaWithAttributes: IRSchema = {
			key: 'with-attributes',
			sourcePath: '/schemas/with-attributes.schema.json',
			hash: 'schema-hash',
			provenance: 'manual',
			schema: {
				type: 'object',
				properties: {
					title: {
						type: 'string',
						default: 'Untitled',
						description: 'Display title',
					},
					status: {
						enum: ['draft', 'published'],
						description: 'Current status',
					},
					multi: {
						type: ['string', 'boolean', 'unknown'],
					},
					described: {
						description: 'Only description',
					},
					defaultOnly: {
						default: 0,
					},
					typedEnum: {
						type: 'number',
						enum: [1, 2],
					},
					mixedEnum: {
						enum: ['alpha', 1],
					},
					unknownType: {
						type: 'mystery',
					},
					emptyEnum: {
						enum: [],
					},
					invalid: 'not-a-record',
				},
			},
		};

		const ir = makeIr({
			schemas: [schemaWithAttributes],
			resources: [
				makeResource('Alpha Resource', schemaWithAttributes.key),
			],
			phpOutputDir: '.generated/php',
		});

		const derived = deriveResourceBlocks({
			ir,
			existingBlocks: new Map<string, IRBlock>(),
		});

		expect(derived).toHaveLength(1);
		const [entry] = derived;

		expect(entry.block).toMatchObject({
			key: 'test-namespace/alpha-resource',
			directory: '.generated/blocks/alpha-resource',
			hasRender: false,
			manifestSource: '.generated/blocks/alpha-resource/block.json',
		});
		expect(entry.block.id).toEqual(expect.stringMatching(/^blk:/));
		expect(entry.block.hash).toMatchObject({
			algo: 'sha256',
			inputs: ['key', 'directory', 'hasRender', 'manifestSource'],
		});
		expect(typeof entry.block.hash.value).toBe('string');

		expect(entry.manifest).toEqual(
			expect.objectContaining({
				name: 'test-namespace/alpha-resource',
				title: 'Alpha Resource',
				description:
					'Alpha Resource block generated from project config',
				textdomain: 'test-namespace',
				attributes: {
					title: {
						type: 'string',
						default: 'Untitled',
						description: 'Display title',
					},
					status: {
						enum: ['draft', 'published'],
						type: 'string',
						description: 'Current status',
					},
					multi: {
						type: ['string', 'boolean'],
					},
					described: {
						description: 'Only description',
					},
					defaultOnly: {
						default: 0,
					},
					typedEnum: {
						type: 'number',
						enum: [1, 2],
					},
					mixedEnum: {
						enum: ['alpha', 1],
					},
				},
			})
		);

		const manifestAttributes = (entry.manifest as Record<string, unknown>)
			.attributes as Record<string, unknown>;

		expect(manifestAttributes).not.toHaveProperty('unknownType');
		expect(manifestAttributes).not.toHaveProperty('emptyEnum');
		expect(manifestAttributes).not.toHaveProperty('invalid');
	});

	it('skips ineligible resources and derives fallback manifest metadata', () => {
		const schemaWithoutObject: IRSchema = {
			key: 'non-object',
			sourcePath: '/schemas/non-object.schema.json',
			hash: 'schema-non-object',
			provenance: 'manual',
			schema: {
				type: 'string',
			},
		};

		const ir = makeIr({
			schemas: [schemaWithoutObject],
			resources: [
				makeResource('Existing Resource', 'non-object'),
				makeResource('SSR Resource', 'non-object', {
					storage: { mode: 'wp-post' },
					routes: [
						makeRoute({
							method: 'GET',
							transport: 'local',
						}),
					],
				}),
				makeResource('Ui Only', 'missing-schema', {
					routes: [
						makeRoute({
							method: 'POST',
							transport: 'remote',
						}),
					],
					ui: { admin: { dataviews: {} } },
				}),
				makeResource('!!!', schemaWithoutObject.key),
			],
			phpOutputDir: '.generated/php',
		});

		const existingBlock: IRBlock = {
			key: 'test-namespace/existing-resource',
			directory: '.generated/blocks/existing-resource',
			hasRender: false,
			manifestSource: '.generated/blocks/existing-resource/block.json',
		};

		const derived = deriveResourceBlocks({
			ir,
			existingBlocks: new Map([[existingBlock.key, existingBlock]]),
		});

		expect(derived).toHaveLength(2);

		const manifestByKey = new Map(
			derived.map((entry) => [entry.block.key, entry.manifest])
		);

		const uiManifest = manifestByKey.get('test-namespace/ui-only');
		expect(uiManifest).toBeDefined();
		expect(uiManifest).toMatchObject({ title: 'Ui Only' });
		expect(uiManifest).not.toHaveProperty('attributes');

		const unnamedManifest = manifestByKey.get('test-namespace/');
		expect(unnamedManifest).toBeDefined();
		expect(unnamedManifest).toMatchObject({
			title: 'Resource',
			name: 'test-namespace/',
		});
	});
});

type ResourceOverrides = Partial<
	Omit<
		IRResource,
		| 'name'
		| 'schemaKey'
		| 'schemaProvenance'
		| 'routes'
		| 'cacheKeys'
		| 'hash'
		| 'warnings'
	> & {
		routes: IRRoute[];
		cacheKeys: IRResource['cacheKeys'];
	}
> & {
	schemaProvenance?: IRResource['schemaProvenance'];
	routes?: IRRoute[];
	cacheKeys?: Partial<IRResource['cacheKeys']>;
	hash?: string;
	warnings?: IRResource['warnings'];
};

function makeIr(options?: {
	schemas?: IRSchema[];
	resources?: IRResource[];
	phpOutputDir?: string;
	namespace?: string;
}): IRv1 {
	const namespace = options?.namespace ?? 'test-namespace';
	const config: WPKernelConfigV1 = {
		version: 1,
		namespace,
		schemas: {},
		resources: {},
	};

	return {
		meta: {
			version: 1,
			namespace,
			sourcePath: '/path/to/wpk.config.ts',
			origin: 'typescript',
			sanitizedNamespace: namespace,
		},
		config,
		schemas: options?.schemas ?? [],
		resources: options?.resources ?? [],
		capabilities: [],
		capabilityMap: {
			definitions: [],
			fallback: {
				capability: 'manage_' + namespace,
				appliesTo: 'resource',
			},
			missing: [],
			unused: [],
			warnings: [],
		},
		blocks: [],
		php: {
			namespace,
			autoload: 'inc/',
			outputDir: options?.phpOutputDir ?? '.generated/php',
		},
		diagnostics: [],
	} satisfies IRv1;
}

function makeResource(
	name: string,
	schemaKey: string,
	overrides?: ResourceOverrides
): IRResource {
	const routes = overrides?.routes ?? [makeRoute()];
	const cacheKeys = buildCacheKeys(overrides?.cacheKeys);

	return {
		id: overrides?.id ?? `res:${name}`,
		name,
		schemaKey,
		schemaProvenance: overrides?.schemaProvenance ?? 'manual',
		routes,
		cacheKeys,
		identity: overrides?.identity,
		storage: overrides?.storage,
		queryParams: overrides?.queryParams,
		ui: overrides?.ui,
		hash:
			overrides?.hash ??
			makeHash(`${name}-hash`, ['name', 'schemaKey', 'schemaProvenance']),
		warnings: overrides?.warnings ?? [],
	} satisfies IRResource;
}

function buildCacheKeys(
	overrides?: Partial<IRResource['cacheKeys']>
): IRResource['cacheKeys'] {
	return {
		list: overrides?.list ?? makeCacheKey('list'),
		get: overrides?.get ?? makeCacheKey('get'),
		create: overrides?.create,
		update: overrides?.update,
		remove: overrides?.remove,
	} satisfies IRResource['cacheKeys'];
}

function makeCacheKey(label: string): IRResourceCacheKey {
	return {
		segments: [label],
		source: 'default',
	} satisfies IRResourceCacheKey;
}

function makeRoute(overrides?: Partial<IRRoute>): IRRoute {
	return {
		method: 'GET',
		path: '/resource',
		hash:
			overrides?.hash ??
			makeHash('route-hash', [
				'method',
				'path',
				'capability',
				'transport',
			]),
		transport: 'remote',
		...overrides,
	} satisfies IRRoute;
}

function makeHash(label: string, inputs: readonly string[]): IRHashProvenance {
	return {
		algo: 'sha256',
		inputs: Array.from(inputs),
		value: label,
	} satisfies IRHashProvenance;
}
