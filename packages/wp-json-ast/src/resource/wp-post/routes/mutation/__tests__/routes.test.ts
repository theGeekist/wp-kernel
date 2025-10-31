import type { ResourceStorageConfig } from '@wpkernel/core/resource';

import {
	buildCreateRouteStatements,
	buildUpdateRouteStatements,
	buildDeleteRouteStatements,
	type BuildCreateRouteStatementsOptions,
} from '..';
import type { MutationMetadataKeys } from '../../../mutation';

type WpPostStorage = Extract<ResourceStorageConfig, { mode: 'wp-post' }>;

describe('wp-post mutation route builders', () => {
	const metadataKeys: MutationMetadataKeys = {
		cacheSegment: 'cache:wp-post',
		channelTag: 'resource.wpPost.mutation',
		statusValidation: 'mutation:status',
		syncMeta: 'mutation:meta',
		syncTaxonomies: 'mutation:taxonomies',
		cachePriming: 'mutation:cache',
	};

	const storage: WpPostStorage = {
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
	};

	const resource: BuildCreateRouteStatementsOptions['resource'] = {
		name: 'book',
		storage,
	};

	const identity = { type: 'number', param: 'id' } as const;
	const pascalName = 'Book';

	it('emits create route statements with macros in expected order', () => {
		const statements = buildCreateRouteStatements({
			resource,
			pascalName,
			metadataKeys,
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
			resource,
			pascalName,
			metadataKeys,
			identity,
		});

		expect(statements).not.toBeNull();
		expect(statements).toMatchSnapshot('update-route-statements');
	});

	it('emits delete route statements with previous response payload', () => {
		const statements = buildDeleteRouteStatements({
			resource,
			pascalName,
			metadataKeys,
			identity,
		});

		expect(statements).not.toBeNull();
		expect(statements).toMatchSnapshot('delete-route-statements');
	});
});
