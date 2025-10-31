import { buildWpTaxonomyHelperArtifacts } from '../buildWpTaxonomyHelperArtifacts';
import type { ResolvedIdentity } from '../../../pipeline/identity';
import type { WpTaxonomyStorageConfig } from '../helpers';

const storage: WpTaxonomyStorageConfig = {
	mode: 'wp-taxonomy',
	taxonomy: 'job_category',
	hierarchical: true,
};

const identity: ResolvedIdentity = {
	type: 'string',
	param: 'slug',
};

function buildArtifacts() {
	return buildWpTaxonomyHelperArtifacts({
		pascalName: 'JobCategories',
		storage,
		identity,
		errorCodeFactory: (suffix) => `taxonomy_${suffix}`,
	});
}

describe('buildWpTaxonomyHelperArtifacts', () => {
	it('returns helper class methods and their signatures', () => {
		const artifacts = buildArtifacts();

		expect(artifacts.helperMethods).toHaveLength(5);
		const methodNames = artifacts.helperMethods.map(
			(method) => method.name?.name
		);
		expect(methodNames).toEqual(
			expect.arrayContaining([
				'getJobCategoriesTaxonomy',
				'prepareJobCategoriesTermResponse',
				'resolveJobCategoriesTerm',
				'extractJobCategoriesTermArgs',
				'validateJobCategoriesIdentity',
			])
		);

		expect(artifacts.helperSignatures).toEqual([
			'private function getJobCategoriesTaxonomy(): string',
			'private function prepareJobCategoriesTermResponse( WP_Term $term ): array',
			'private function resolveJobCategoriesTerm( $identity ): ?WP_Term',
			'private function extractJobCategoriesTermArgs( WP_REST_Request $request ): array',
			'private function validateJobCategoriesIdentity( $value )',
		]);
	});
});
