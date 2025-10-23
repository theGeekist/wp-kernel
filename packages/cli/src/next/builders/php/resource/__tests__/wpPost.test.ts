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
			'                $genreMeta = array_values( (array) $genreMeta );'
		);
		expect(lines).toContain(
			'                $genreMeta = array_filter( $genreMeta, static fn ( $value ) => match ( trim( (string) $value ) ) {'
		);
		expect(lines).toContain("                        '' => false,");
		expect(lines).toContain('                        default => true,');
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
		expect(printable.lines).toEqual(['                $items = [];']);
	});

	it('creates the foreach loop with guards and response push', () => {
		const printable = createListForeachPrintable({
			pascalName: 'Article',
			indentLevel: 1,
		});

		expect(printable.lines).toEqual([
			'        foreach ( $query->posts as $post_id ) {',
			'                $post = get_post( $post_id );',
			'                if ( ! $post instanceof WP_Post ) {',
			'                        continue;',
			'                }',
			'',
			'                $items[] = $this->prepareArticleResponse( $post, $request );',
			'        }',
		]);
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
		expect(statements[0]?.lines).toEqual([
			'        if ( null === $book_id ) {',
			"                return new WP_Error( 'book_missing_identifier', 'Missing identifier for Book.', [ 'status' => 400 ] );",
			'        }',
		]);
		expect(statements[1]?.lines).toEqual([
			'        $book_id = (int) $book_id;',
		]);
		expect(statements[2]?.lines).toEqual([
			'        if ( $book_id <= 0 ) {',
			"                return new WP_Error( 'book_invalid_identifier', 'Invalid identifier for Book.', [ 'status' => 400 ] );",
			'        }',
		]);
	});

	it('creates string identifier validation statements', () => {
		const statements = createIdentityValidationPrintables({
			identity: { type: 'string', param: 'slug' },
			indentLevel: 1,
			pascalName: 'Book',
			errorCodeFactory: (suffix) => `book_${suffix}`,
		});

		expect(statements).toHaveLength(2);
		expect(statements[0]?.lines).toEqual([
			"        if ( ! is_string( $slug ) || '' === trim( $slug ) ) {",
			"                return new WP_Error( 'book_missing_identifier', 'Missing identifier for Book.', [ 'status' => 400 ] );",
			'        }',
		]);
		expect(statements[1]?.lines).toEqual([
			'        $slug = trim( (string) $slug );',
		]);
	});
});
