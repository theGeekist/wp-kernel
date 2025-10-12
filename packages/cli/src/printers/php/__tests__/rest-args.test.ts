import type { IRResource, IRSchema } from '../../../ir';
import { buildRestArgsPayload } from '../rest-args';

describe('buildRestArgsPayload', () => {
	it('returns an empty object when schema is missing', () => {
		const resource = createResource();
		expect(buildRestArgsPayload(undefined, resource)).toEqual({});
	});

	it('captures required fields, identity and query parameters', () => {
		const resource = createResource({
			identity: { type: 'string', param: 'slug' },
			queryParams: {
				search: {
					type: 'string',
					description: 'Search text',
					optional: true,
				},
				status: {
					type: 'enum',
					enum: ['draft', 'published'],
				},
			},
		});

		const schema: IRSchema = {
			key: 'job',
			schema: {
				type: 'object',
				required: ['title', 'slug'],
				properties: {
					title: { type: 'string' },
					slug: { type: 'string' },
				},
			},
			source: 'config',
		} as unknown as IRSchema;

		const result = buildRestArgsPayload(schema, resource);

		expect(result.title).toEqual({
			schema: { type: 'string' },
			required: true,
		});
		expect(result.slug).toEqual({
			schema: { type: 'string' },
			required: true,
			identity: { type: 'string', param: 'slug' },
		});
		expect(result.search).toEqual({
			schema: { type: 'string' },
			description: 'Search text',
		});
		expect(result.status).toEqual({
			schema: { type: 'string', enum: ['draft', 'published'] },
			required: true,
		});
	});
});

function createResource(overrides: Partial<IRResource> = {}): IRResource {
	return {
		name: 'job',
		schemaKey: 'job',
		schemaProvenance: 'config',
		routes: [],
		cacheKeys: {},
		identity: undefined,
		storage: undefined,
		queryParams: undefined,
		ui: undefined,
		hash: 'resource-job',
		warnings: [],
		...overrides,
	} as unknown as IRResource;
}
