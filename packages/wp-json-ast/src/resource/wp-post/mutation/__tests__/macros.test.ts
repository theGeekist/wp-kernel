import {
	buildStatusValidationStatements,
	buildSyncMetaStatements,
	buildSyncTaxonomiesStatements,
	buildCachePrimingStatements,
	buildVariableExpression,
	buildArrayDimExpression,
	buildPropertyExpression,
	type MutationMetadataKeys,
} from '../macros';

const METADATA_KEYS: MutationMetadataKeys = {
	cacheSegment: 'cache:wp-post',
	channelTag: 'resource.wpPost.mutation',
	statusValidation: 'mutation:status',
	syncMeta: 'mutation:meta',
	syncTaxonomies: 'mutation:taxonomies',
	cachePriming: 'mutation:cache',
};

describe('wp-post mutation macros', () => {
	it('builds status validation statements with metadata comments', () => {
		const statements = buildStatusValidationStatements({
			metadataKeys: METADATA_KEYS,
			pascalName: 'Book',
			target: buildArrayDimExpression('post_data', 'status'),
			requestVariable: buildVariableExpression('request'),
			statusVariable: buildVariableExpression('status'),
		});

		expect(statements).toMatchSnapshot('status-validation');
	});

	it('builds guarded status validation when requested', () => {
		const statements = buildStatusValidationStatements({
			metadataKeys: METADATA_KEYS,
			pascalName: 'Book',
			target: buildArrayDimExpression('post_data', 'status'),
			guardWithNullCheck: true,
		});

		expect(statements).toMatchSnapshot('status-validation-guarded');
	});

	it('builds sync meta statements with metadata annotations', () => {
		const statements = buildSyncMetaStatements({
			metadataKeys: METADATA_KEYS,
			pascalName: 'Book',
			postId: buildVariableExpression('post_id'),
		});

		expect(statements).toMatchSnapshot('sync-meta');
	});

	it('builds sync taxonomies statements with result guard', () => {
		const statements = buildSyncTaxonomiesStatements({
			metadataKeys: METADATA_KEYS,
			pascalName: 'Book',
			postId: buildPropertyExpression('post', 'ID'),
			resultVariable: buildVariableExpression('result'),
		});

		expect(statements).toMatchSnapshot('sync-taxonomies');
	});

	it('builds cache priming statements with failure guard', () => {
		const statements = buildCachePrimingStatements({
			metadataKeys: METADATA_KEYS,
			pascalName: 'Book',
			postId: buildVariableExpression('post_id'),
			errorCode: 'wpkernel_book_failed',
			failureMessage: 'Unable to load Book.',
		});

		expect(statements).toMatchSnapshot('cache-priming');
	});
});
