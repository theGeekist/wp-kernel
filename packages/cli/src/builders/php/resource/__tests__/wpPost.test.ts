import {
	buildListForeachStatement,
	buildListItemsInitialiserStatement,
	buildMetaQueryStatements,
	collectMetaQueryEntries,
	buildTaxonomyQueryStatements,
	collectTaxonomyQueryEntries,
	buildIdentityValidationStatements,
} from '../index';
import {
	buildListForeachStatement as packageBuildListForeachStatement,
	buildListItemsInitialiserStatement as packageBuildListItemsInitialiserStatement,
	buildMetaQueryStatements as packageBuildMetaQueryStatements,
	collectMetaQueryEntries as packageCollectMetaQueryEntries,
	buildTaxonomyQueryStatements as packageBuildTaxonomyQueryStatements,
	collectTaxonomyQueryEntries as packageCollectTaxonomyQueryEntries,
	buildIdentityGuardStatements,
} from '@wpkernel/wp-json-ast';

describe('wpPost query helper re-exports', () => {
	it('re-exports list helpers from wp-json-ast', () => {
		expect(buildListForeachStatement).toBe(
			packageBuildListForeachStatement
		);
		expect(buildListItemsInitialiserStatement).toBe(
			packageBuildListItemsInitialiserStatement
		);
	});

	it('re-exports meta query helpers from wp-json-ast', () => {
		expect(buildMetaQueryStatements).toBe(packageBuildMetaQueryStatements);
		expect(collectMetaQueryEntries).toBe(packageCollectMetaQueryEntries);
	});

	it('re-exports taxonomy query helpers from wp-json-ast', () => {
		expect(buildTaxonomyQueryStatements).toBe(
			packageBuildTaxonomyQueryStatements
		);
		expect(collectTaxonomyQueryEntries).toBe(
			packageCollectTaxonomyQueryEntries
		);
	});
});

describe('wpPost identity helpers', () => {
	it('re-export identity validation helpers from wp-json-ast', () => {
		expect(buildIdentityValidationStatements).toBe(
			buildIdentityGuardStatements
		);
	});
});
