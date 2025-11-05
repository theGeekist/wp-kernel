import {
	buildListForeachStatement,
	buildListItemsInitialiserStatement,
	buildMetaQueryStatements,
	collectMetaQueryEntries,
	buildTaxonomyQueryStatements,
	collectTaxonomyQueryEntries,
} from '@wpkernel/wp-json-ast';

describe('wpPost query helper re-exports', () => {
	it('re-exports list helpers from wp-json-ast', () => {
		expect(buildListForeachStatement).toBe(buildListForeachStatement);
		expect(buildListItemsInitialiserStatement).toBe(
			buildListItemsInitialiserStatement
		);
	});

	it('re-exports meta query helpers from wp-json-ast', () => {
		expect(buildMetaQueryStatements).toBe(buildMetaQueryStatements);
		expect(collectMetaQueryEntries).toBe(collectMetaQueryEntries);
	});

	it('re-exports taxonomy query helpers from wp-json-ast', () => {
		expect(buildTaxonomyQueryStatements).toBe(buildTaxonomyQueryStatements);
		expect(collectTaxonomyQueryEntries).toBe(collectTaxonomyQueryEntries);
	});
});
