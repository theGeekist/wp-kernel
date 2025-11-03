import {
	buildGetTaxonomyCall,
	buildPrepareTaxonomyTermResponseCall,
	buildResolveTaxonomyTermCall,
	buildTaxonomyAssignmentStatement,
	buildWpTaxonomyGetRouteStatements,
	buildWpTaxonomyHelperArtifacts,
	buildWpTaxonomyHelperMethods,
	buildWpTaxonomyListRouteStatements,
	buildWpTaxonomyQueryRouteBundle,
	ensureWpTaxonomyStorage,
} from '@wpkernel/wp-json-ast';
import * as taxonomyHelpers from '../wpTaxonomy/helpers';
import * as taxonomyGet from '../wpTaxonomy/get';
import * as taxonomyList from '../wpTaxonomy/list';
import * as taxonomySurface from '../wpTaxonomy';

describe('wp taxonomy exports', () => {
	it('re-exports taxonomy helper builders', () => {
		expect(taxonomyHelpers.buildWpTaxonomyHelperArtifacts).toBe(
			buildWpTaxonomyHelperArtifacts
		);
		expect(taxonomyHelpers.buildWpTaxonomyHelperMethods).toBe(
			buildWpTaxonomyHelperMethods
		);
		expect(taxonomyHelpers.buildTaxonomyAssignmentStatement).toBe(
			buildTaxonomyAssignmentStatement
		);
		expect(taxonomyHelpers.buildGetTaxonomyCall).toBe(buildGetTaxonomyCall);
		expect(taxonomyHelpers.buildResolveTaxonomyTermCall).toBe(
			buildResolveTaxonomyTermCall
		);
		expect(taxonomyHelpers.buildPrepareTaxonomyTermResponseCall).toBe(
			buildPrepareTaxonomyTermResponseCall
		);
		expect(taxonomyHelpers.ensureWpTaxonomyStorage).toBe(
			ensureWpTaxonomyStorage
		);
	});

	it('passes through query route builders', () => {
		expect(taxonomyGet.buildWpTaxonomyGetRouteStatements).toBe(
			buildWpTaxonomyGetRouteStatements
		);
		expect(taxonomyList.buildWpTaxonomyListRouteStatements).toBe(
			buildWpTaxonomyListRouteStatements
		);
	});

	it('exposes the aggregate taxonomy surface', () => {
		expect(taxonomySurface.buildWpTaxonomyQueryRouteBundle).toBe(
			buildWpTaxonomyQueryRouteBundle
		);
		expect(taxonomySurface.buildWpTaxonomyHelperArtifacts).toBe(
			buildWpTaxonomyHelperArtifacts
		);
		expect(taxonomySurface.buildWpTaxonomyHelperMethods).toBe(
			buildWpTaxonomyHelperMethods
		);
	});
});
