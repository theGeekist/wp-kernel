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

		const method = syncWpPostMeta({
			resource,
			pascalName: 'Book',
			identity: IDENTITY,
		});

		expect(method).toMatchSnapshot('meta-empty-output');
	});

	it('sanitises meta payloads for all supported descriptor types', () => {
		const resource = createResource();

		const method = syncWpPostMeta({
			resource,
			pascalName: 'Book',
			identity: IDENTITY,
		});

		expect(method).toMatchSnapshot('meta-sanitizers-output');
	});

	it('wraps taxonomy assignments with result checks', () => {
		const resource = createResource();

		const method = syncWpPostTaxonomies({
			resource,
			pascalName: 'Book',
			identity: IDENTITY,
		});

		expect(method).toMatchSnapshot('taxonomy-sync-output');
	});

	it('returns early when no taxonomies are configured', () => {
		const resource = createResource({ taxonomies: {} });

		const method = syncWpPostTaxonomies({
			resource,
			pascalName: 'Book',
			identity: IDENTITY,
		});

		expect(method).toMatchSnapshot('taxonomy-empty-output');
	});

	it('prepares mutation responses with supports, meta, and taxonomies', () => {
		const resource = createResource();

		const method = prepareWpPostResponse({
			resource,
			pascalName: 'Book',
			identity: IDENTITY,
		});

		expect(method).toMatchSnapshot('prepare-response-output');
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

		const method = prepareWpPostResponse({
			resource,
			pascalName: 'Book',
			identity: { type: 'number', param: 'post_id' },
		});

		const assignedKeys = new Set(
			method.stmts.flatMap((statement) => {
				if (
					statement.nodeType === 'Stmt_Expression' &&
					statement.expr.nodeType === 'Expr_Assign'
				) {
					const { var: target } = statement.expr;
					if (
						target.nodeType === 'Expr_ArrayDimFetch' &&
						target.var.nodeType === 'Expr_Variable' &&
						target.var.name === 'data' &&
						target.dim?.nodeType === 'Scalar_String'
					) {
						return [target.dim.value];
					}
				}

				return [];
			})
		);

		expect(assignedKeys.has('slug')).toBe(false);
		expect(assignedKeys.has('title')).toBe(false);
		expect(assignedKeys.has('content')).toBe(false);
		expect(assignedKeys.has('excerpt')).toBe(false);
	});
});
