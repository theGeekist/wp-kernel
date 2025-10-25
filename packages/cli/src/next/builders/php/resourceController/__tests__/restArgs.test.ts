import type { IRResource, IRSchema } from '../../../../../ir/types';
import { buildRestArgs } from '../restArgs';

function buildResource(overrides: Partial<IRResource> = {}): IRResource {
	return {
		name: 'books',
		schemaKey: 'book',
		schemaProvenance: 'manual',
		routes: [],
		cacheKeys: {
			list: { segments: ['books', 'list'], source: 'default' },
			get: { segments: ['books', 'get'], source: 'default' },
			create: { segments: ['books', 'create'], source: 'default' },
			update: { segments: ['books', 'update'], source: 'default' },
			remove: { segments: ['books', 'remove'], source: 'default' },
		},
		identity: { type: 'string', param: 'slug' },
		storage: {
			mode: 'wp-post',
			postType: 'book',
			statuses: ['draft', 'publish'],
			supports: ['title'],
			meta: {},
			taxonomies: {},
		},
		queryParams: undefined,
		ui: undefined,
		hash: 'resource-hash',
		warnings: [],
		...overrides,
	} as IRResource;
}

function buildSchema(schema: unknown): IRSchema {
	return {
		key: 'book',
		sourcePath: 'schema/book.json',
		hash: 'schema-hash',
		schema,
		provenance: 'manual',
	};
}

describe('buildRestArgs', () => {
	it('returns empty object when the schema cannot be resolved', () => {
		const resource = buildResource();

		expect(buildRestArgs([], resource)).toEqual({});
	});

	it('returns empty object when the schema payload is not an object', () => {
		const resource = buildResource();
		const schema = buildSchema('not-a-record');

		expect(buildRestArgs([schema], resource)).toEqual({});
	});

	it('builds rest args from schema properties and honours required identity fields', () => {
		const resource = buildResource();
		const schema = buildSchema({
			required: ['title'],
			properties: {
				title: { type: 'string', minLength: 1 },
				slug: { type: 'string', pattern: '[a-z]+' },
			},
		});

		const restArgs = buildRestArgs([schema], resource);

		expect(restArgs).toEqual({
			slug: {
				schema: { pattern: '[a-z]+', type: 'string' },
				identity: resource.identity,
			},
			title: {
				required: true,
				schema: { minLength: 1, type: 'string' },
			},
		});
	});

	it('merges query param descriptors while preserving schema-derived metadata', () => {
		const resource = buildResource({
			queryParams: {
				status: {
					type: 'enum',
					enum: ['draft', 'publish'],
					optional: false,
					description: 'Filter by post status.',
				},
				search: {
					type: 'string',
					optional: true,
				},
				slug: {
					type: 'string',
					description: 'Explicit slug override.',
					optional: false,
				},
			},
		});
		const schema = buildSchema({
			required: ['title'],
			properties: {
				slug: { type: 'string', pattern: '[a-z]+' },
				title: { type: 'string', minLength: 1 },
			},
		});

		const restArgs = buildRestArgs([schema], resource);

		expect(restArgs.slug).toEqual({
			description: 'Explicit slug override.',
			identity: resource.identity,
			required: true,
			schema: { pattern: '[a-z]+', type: 'string' },
		});
		expect(restArgs.status).toEqual({
			description: 'Filter by post status.',
			required: true,
			schema: { enum: ['draft', 'publish'], type: 'string' },
		});
		expect(restArgs.search).toEqual({
			schema: { type: 'string' },
		});
	});
});
