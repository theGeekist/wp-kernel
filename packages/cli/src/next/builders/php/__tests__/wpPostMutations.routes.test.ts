import {
	WP_POST_MUTATION_CONTRACT,
	buildCreateRouteStatements,
	buildUpdateRouteStatements,
	buildDeleteRouteStatements,
	syncWpPostMeta,
	syncWpPostTaxonomies,
	prepareWpPostResponse,
} from '../resource/wpPost/mutations';
import type { IRResource } from '../../../ir/publicTypes';

const CONTRACT = WP_POST_MUTATION_CONTRACT;

const RESOURCE: IRResource = {
	name: 'book',
	schemaKey: 'book',
	schemaProvenance: 'manual',
	routes: [],
	cacheKeys: {
		list: { segments: ['book', 'list'], source: 'default' },
		get: { segments: ['book', 'get'], source: 'default' },
		create: { segments: ['book', 'create'], source: 'default' },
		update: { segments: ['book', 'update'], source: 'default' },
		remove: { segments: ['book', 'remove'], source: 'default' },
	},
	identity: { type: 'number', param: 'id' },
	storage: {
		mode: 'wp-post',
		postType: 'book',
		statuses: ['draft', 'publish'],
		supports: ['title', 'editor'],
		meta: {
			subtitle: { type: 'string' },
		},
		taxonomies: {
			category: { taxonomy: 'category' },
		},
	},
	queryParams: {},
	ui: undefined,
	hash: 'book-hash',
	warnings: [],
};

const PASCAL_NAME = 'Book';
const IDENTITY = { type: 'number', param: 'id' } as const;

describe('wp-post mutation route builders', () => {
	it('emits create route statements with macros in expected order', () => {
		const statements = buildCreateRouteStatements({
			resource: RESOURCE,
			pascalName: PASCAL_NAME,
			metadataKeys: CONTRACT.metadataKeys,
		});

		expect(statements).not.toBeNull();

		const metadataStatements = (statements ?? []).filter(
			(statement) => statement.nodeType === 'Stmt_Nop'
		);

		expect(metadataStatements).toHaveLength(9);

		expect(statements).toMatchSnapshot('create-route-statements');
	});

	it('emits update route statements with guarded status macro', () => {
		const statements = buildUpdateRouteStatements({
			resource: RESOURCE,
			pascalName: PASCAL_NAME,
			metadataKeys: CONTRACT.metadataKeys,
			identity: IDENTITY,
		});

		expect(statements).not.toBeNull();
		expect(statements).toMatchSnapshot('update-route-statements');
	});

	it('emits delete route statements with previous response payload', () => {
		const statements = buildDeleteRouteStatements({
			resource: RESOURCE,
			pascalName: PASCAL_NAME,
			metadataKeys: CONTRACT.metadataKeys,
			identity: IDENTITY,
		});

		expect(statements).not.toBeNull();
		expect(statements).toMatchSnapshot('delete-route-statements');
	});
});

describe('wp-post mutation helpers', () => {
	it('returns helper class methods for meta, taxonomy, and response builders', () => {
		const helpers = [
			syncWpPostMeta({
				resource: RESOURCE,
				pascalName: PASCAL_NAME,
				identity: IDENTITY,
			}),
			syncWpPostTaxonomies({
				resource: RESOURCE,
				pascalName: PASCAL_NAME,
				identity: IDENTITY,
			}),
			prepareWpPostResponse({
				resource: RESOURCE,
				pascalName: PASCAL_NAME,
				identity: IDENTITY,
			}),
		];

		expect(helpers.map((helper) => helper.name.name)).toEqual([
			`sync${PASCAL_NAME}Meta`,
			`sync${PASCAL_NAME}Taxonomies`,
			`prepare${PASCAL_NAME}Response`,
		]);
		expect(helpers).toMatchSnapshot('helper-methods');
	});
});
