import {
	buildArrayDimExpression,
	buildCachePrimingStatements,
	buildPropertyExpression,
	buildStatusValidationStatements,
	buildSyncMetaStatements,
	buildSyncTaxonomiesStatements,
	buildVariableExpression,
	prepareWpPostResponse,
	syncWpPostMeta,
	syncWpPostTaxonomies,
} from '@wpkernel/wp-json-ast';
import * as mutationHelpers from '../mutations/helpers';
import * as mutationMacros from '../mutations/macros';

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
});
