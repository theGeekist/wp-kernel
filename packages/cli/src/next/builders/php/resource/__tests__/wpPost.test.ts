import {
	appendMetaQueryBuilder,
	collectMetaQueryEntries,
} from '../wpPost/metaQuery';
import { collectTaxonomyQueryEntries } from '../wpPost/taxonomyQuery';
import {
	createListForeachPrintable,
	createListItemsInitialiser,
} from '../wpPost/list';
import { createIdentityValidationPrintables } from '../wpPost/identity';
import { PhpMethodBodyBuilder, PHP_INDENT } from '@wpkernel/php-json-ast';

describe('wpPost query helpers', () => {
	it('collects meta query entries', () => {
		const entries = collectMetaQueryEntries({
			meta: {
				genre: { single: false },
				subtitle: null,
			},
		});

		expect(entries).toEqual([
			['genre', { single: false }],
			['subtitle', undefined],
		]);
	});

	it('normalises multi-value meta queries without coercing retained values', () => {
		const body = new PhpMethodBodyBuilder(PHP_INDENT, 1);

		appendMetaQueryBuilder({
			body,
			indentLevel: 1,
			entries: [['genre', { single: false }]],
		});

		const lines = body.toLines();
		expect(lines).toContain(
			'                $genreMeta = array_values((array) $genreMeta);'
		);
		const filterLine = lines.find((line) =>
			line.includes('$genreMeta = array_filter')
		);
		expect(filterLine).toBeDefined();
		expect(filterLine).toContain(
			'static fn ($value) => match (trim((string) $value)) {'
		);
		expect(filterLine).toContain("'' => false");
		expect(filterLine).toContain('default => true');
		expect(lines).not.toContain("array_map( 'strval'");
		expect(lines).not.toContain("array_map( 'trim'");
	});

	it('collects taxonomy query entries', () => {
		const entries = collectTaxonomyQueryEntries({
			taxonomies: {
				category: { taxonomy: 'category' },
				invalid: {},
			},
		});

		expect(entries).toEqual([['category', { taxonomy: 'category' }]]);
	});
});

describe('wpPost list helpers', () => {
	it('initialises the items array with indentation', () => {
		const printable = createListItemsInitialiser({ indentLevel: 2 });
		expect(printable.node).toMatchObject({
			nodeType: 'Stmt_Expression',
			expr: {
				nodeType: 'Expr_Assign',
				var: { nodeType: 'Expr_Variable', name: 'items' },
				expr: { nodeType: 'Expr_Array', items: [] },
			},
		});
	});

	it('creates the foreach loop with guards and response push', () => {
		const printable = createListForeachPrintable({
			pascalName: 'Article',
			indentLevel: 1,
		});

		expect(printable.node).toMatchObject({
			nodeType: 'Stmt_Foreach',
			expr: {
				nodeType: 'Expr_PropertyFetch',
				name: { nodeType: 'Identifier', name: 'posts' },
			},
			valueVar: { nodeType: 'Expr_Variable', name: 'post_id' },
			stmts: expect.arrayContaining([
				expect.objectContaining({
					nodeType: 'Stmt_Expression',
				}),
			]),
		});
	});
});

describe('wpPost identity helpers', () => {
	it('creates numeric identifier validation statements', () => {
		const statements = createIdentityValidationPrintables({
			identity: { type: 'number', param: 'book_id' },
			indentLevel: 1,
			pascalName: 'Book',
			errorCodeFactory: (suffix) => `book_${suffix}`,
		});

		expect(statements).toHaveLength(3);
		expect(statements[0]?.node).toMatchObject({
			nodeType: 'Stmt_If',
			cond: { nodeType: 'Expr_BinaryOp_Identical' },
		});
		expect(statements[1]?.node).toMatchObject({
			nodeType: 'Stmt_Expression',
			expr: { nodeType: 'Expr_Assign' },
		});
		expect(statements[2]?.node).toMatchObject({
			nodeType: 'Stmt_If',
			cond: { nodeType: 'Expr_BinaryOp_SmallerOrEqual' },
		});
	});

	it('creates string identifier validation statements', () => {
		const statements = createIdentityValidationPrintables({
			identity: { type: 'string', param: 'slug' },
			indentLevel: 1,
			pascalName: 'Book',
			errorCodeFactory: (suffix) => `book_${suffix}`,
		});

		expect(statements).toHaveLength(2);
		expect(statements[0]?.node).toMatchObject({
			nodeType: 'Stmt_If',
			cond: { nodeType: 'Expr_BinaryOp_BooleanOr' },
		});
		expect(statements[1]?.node).toMatchObject({
			nodeType: 'Stmt_Expression',
			expr: { nodeType: 'Expr_Assign' },
		});
	});
});
