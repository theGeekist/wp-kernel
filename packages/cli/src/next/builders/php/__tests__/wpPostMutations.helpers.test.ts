import { KernelError } from '@wpkernel/core/contracts';
import type { IRResource } from '../../../../ir/types';
import type { ResolvedIdentity } from '../../resource/identity';
import {
	prepareWpPostResponse,
	syncWpPostMeta,
	syncWpPostTaxonomies,
} from '../resource/wpPost/mutations/helpers';

const IDENTITY: ResolvedIdentity = { type: 'string', param: 'slug' };

function createResource(
	overrides: Partial<IRResource['storage']> = {}
): IRResource {
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
		identity: IDENTITY,
		storage: {
			mode: 'wp-post',
			postType: 'book',
			statuses: ['draft', 'publish'],
			supports: ['title', 'editor', 'excerpt'],
			meta: {
				rating: { type: 'integer', single: true },
				popularity: { type: 'number', single: true },
				featured: { type: 'boolean', single: true },
				tags: { type: 'array', single: false },
				author: { type: 'string', single: false },
				metadata: { type: 'object', single: true },
			},
			taxonomies: {
				genres: { taxonomy: 'book_genre' },
			},
			...overrides,
		},
		queryParams: undefined,
		ui: undefined,
		hash: 'resource-hash',
		warnings: [],
	} as IRResource;
}

describe('wp-post mutation helpers', () => {
	it('throws a KernelError when the resource does not use wp-post storage', () => {
		const resource: IRResource = {
			...createResource(),
			storage: undefined,
		};

		expect(() =>
			syncWpPostMeta({
				resource,
				pascalName: 'Book',
				identity: IDENTITY,
			})
		).toThrow(KernelError);
	});

	it('returns early when no meta fields are configured', () => {
		const resource = createResource({ meta: {} });

		const template = syncWpPostMeta({
			resource,
			pascalName: 'Book',
			identity: IDENTITY,
		});

		expect(template.join('\n')).toMatchSnapshot('meta-empty-output');
	});

	it('sanitises meta payloads for all supported descriptor types', () => {
		const resource = createResource();

		const template = syncWpPostMeta({
			resource,
			pascalName: 'Book',
			identity: IDENTITY,
		});

		expect(template.join('\n')).toMatchSnapshot('meta-sanitizers-output');
	});

	it('wraps taxonomy assignments with result checks', () => {
		const resource = createResource();

		const template = syncWpPostTaxonomies({
			resource,
			pascalName: 'Book',
			identity: IDENTITY,
		});

		expect(template.join('\n')).toMatchSnapshot('taxonomy-sync-output');
	});

	it('returns early when no taxonomies are configured', () => {
		const resource = createResource({ taxonomies: {} });

		const template = syncWpPostTaxonomies({
			resource,
			pascalName: 'Book',
			identity: IDENTITY,
		});

		expect(template.join('\n')).toMatchSnapshot('taxonomy-empty-output');
	});

	it('prepares mutation responses with supports, meta, and taxonomies', () => {
		const resource = createResource();

		const template = prepareWpPostResponse({
			resource,
			pascalName: 'Book',
			identity: IDENTITY,
		});

		expect(template.join('\n')).toMatchSnapshot('prepare-response-output');
	});

	it('omits slug and support-specific fields when not configured', () => {
		const resource: IRResource = {
			...createResource({
				supports: [],
				meta: {},
				taxonomies: {},
			}),
			identity: { type: 'number', param: 'post_id' },
		};

		const template = prepareWpPostResponse({
			resource,
			pascalName: 'Book',
			identity: { type: 'number', param: 'post_id' },
		});

		const output = template.join('\n');

		expect(output).toContain("'id' => (int) $post->ID");
		expect(output).toContain("'status' => (string) $post->post_status");
		expect(output).not.toContain('post_name');
		expect(output).not.toContain("$data['title']");
		expect(output).not.toContain("$data['content']");
		expect(output).not.toContain("$data['excerpt']");
	});
});
