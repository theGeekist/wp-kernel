import {
	WP_POST_MUTATION_CONTRACT,
	buildArrayDimExpression,
	buildCachePrimingStatements,
	buildCreateRouteStatements,
	buildDeleteRouteStatements,
	buildPropertyExpression,
	buildStatusValidationStatements,
	buildSyncMetaStatements,
	buildSyncTaxonomiesStatements,
	buildUpdateRouteStatements,
	buildVariableExpression,
	prepareWpPostResponse,
	syncWpPostMeta,
	syncWpPostTaxonomies,
} from '@wpkernel/wp-json-ast';
import * as mutationHelpers from '../wpPost/mutations/helpers';
import * as mutationMacros from '../wpPost/mutations/macros';
import * as mutationSurface from '../wpPost/mutations';

describe('wp post mutation exports', () => {
	it('re-exports helper functions from wp-json-ast', () => {
		expect(mutationHelpers.prepareWpPostResponse).toBe(
			prepareWpPostResponse
		);
		expect(mutationHelpers.syncWpPostMeta).toBe(syncWpPostMeta);
		expect(mutationHelpers.syncWpPostTaxonomies).toBe(syncWpPostTaxonomies);
	});

	it('re-exports macro builders from wp-json-ast', () => {
		expect(mutationMacros.buildSyncMetaStatements).toBe(
			buildSyncMetaStatements
		);
		expect(mutationMacros.buildSyncTaxonomiesStatements).toBe(
			buildSyncTaxonomiesStatements
		);
		expect(mutationMacros.buildCachePrimingStatements).toBe(
			buildCachePrimingStatements
		);
		expect(mutationMacros.buildStatusValidationStatements).toBe(
			buildStatusValidationStatements
		);
		expect(mutationMacros.buildArrayDimExpression).toBe(
			buildArrayDimExpression
		);
		expect(mutationMacros.buildVariableExpression).toBe(
			buildVariableExpression
		);
		expect(mutationMacros.buildPropertyExpression).toBe(
			buildPropertyExpression
		);
	});

	it('exposes the unified mutation surface', () => {
		expect(mutationSurface.WP_POST_MUTATION_CONTRACT).toBe(
			WP_POST_MUTATION_CONTRACT
		);
		expect(mutationSurface.buildCreateRouteStatements).toBe(
			buildCreateRouteStatements
		);
		expect(mutationSurface.buildUpdateRouteStatements).toBe(
			buildUpdateRouteStatements
		);
		expect(mutationSurface.buildDeleteRouteStatements).toBe(
			buildDeleteRouteStatements
		);
		expect(mutationSurface.buildSyncTaxonomiesStatements).toBe(
			buildSyncTaxonomiesStatements
		);
		expect(mutationSurface.buildCachePrimingStatements).toBe(
			buildCachePrimingStatements
		);
		expect(mutationSurface.prepareWpPostResponse).toBe(
			prepareWpPostResponse
		);
		expect(mutationSurface.syncWpPostMeta).toBe(syncWpPostMeta);
	});
});
