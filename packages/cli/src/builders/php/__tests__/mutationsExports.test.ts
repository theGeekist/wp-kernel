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

describe('wp post mutation exports', () => {
	it('re-exports helper functions from wp-json-ast', () => {
		expect(prepareWpPostResponse).toBe(prepareWpPostResponse);
		expect(syncWpPostMeta).toBe(syncWpPostMeta);
		expect(syncWpPostTaxonomies).toBe(syncWpPostTaxonomies);
	});

	it('re-exports macro builders from wp-json-ast', () => {
		expect(buildSyncMetaStatements).toBe(buildSyncMetaStatements);
		expect(buildSyncTaxonomiesStatements).toBe(
			buildSyncTaxonomiesStatements
		);
		expect(buildCachePrimingStatements).toBe(buildCachePrimingStatements);
		expect(buildStatusValidationStatements).toBe(
			buildStatusValidationStatements
		);
		expect(buildArrayDimExpression).toBe(buildArrayDimExpression);
		expect(buildVariableExpression).toBe(buildVariableExpression);
		expect(buildPropertyExpression).toBe(buildPropertyExpression);
	});
});
