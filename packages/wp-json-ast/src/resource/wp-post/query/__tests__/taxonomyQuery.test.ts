import {
	collectTaxonomyQueryEntries,
	buildTaxonomyQueryStatements,
} from '../taxonomyQuery';
import type { PhpStmtIf } from '@wpkernel/php-json-ast';

describe('wpPost taxonomy query helpers', () => {
	it('collects taxonomy query entries with taxonomy filtering', () => {
		const entries = collectTaxonomyQueryEntries({
			taxonomies: {
				category: { taxonomy: 'category' },
				invalid: {},
			},
		});

		expect(entries).toEqual([['category', { taxonomy: 'category' }]]);
	});

	it('builds taxonomy query statements with sanitisation', () => {
		const statements = buildTaxonomyQueryStatements({
			entries: [['category', { taxonomy: 'category' }]],
		});

		expect(statements).toHaveLength(4);

		const branchGuard = statements[2] as PhpStmtIf;
		expect(branchGuard.nodeType).toBe('Stmt_If');

		const sanitise = branchGuard.stmts[0];
		const ensureNonEmpty = branchGuard.stmts[1];

		expect(sanitise).toMatchObject({ nodeType: 'Stmt_Expression' });
		expect(ensureNonEmpty).toMatchObject({ nodeType: 'Stmt_If' });
	});
});
