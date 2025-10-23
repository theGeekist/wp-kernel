import { buildWpTermQueryInstantiation } from '../factories/wpTermQuery';

describe('buildWpTermQueryInstantiation', () => {
	it('creates a WP_Term_Query instantiation without arguments', () => {
		const printable = buildWpTermQueryInstantiation({
			target: 'term_query',
		});

		expect(printable.lines).toEqual(['$term_query = new WP_Term_Query();']);
		expect(printable.node.expr).toMatchObject({
			nodeType: 'Expr_Assign',
			expr: {
				nodeType: 'Expr_New',
				class: { parts: ['WP_Term_Query'] },
				args: [],
			},
		});
	});

	it('supports constructor arguments and indentation overrides', () => {
		const printable = buildWpTermQueryInstantiation({
			target: '$query',
			argsVariable: '$args',
			indentLevel: 1,
			indentUnit: '    ',
		});

		expect(printable.lines).toEqual([
			'    $query = new WP_Term_Query( $args );',
		]);
		expect(printable.node.expr).toMatchObject({
			nodeType: 'Expr_Assign',
			expr: {
				nodeType: 'Expr_New',
				args: [expect.anything()],
			},
		});
	});

	it('throws when provided with an empty variable name', () => {
		expect(() =>
			buildWpTermQueryInstantiation({ target: '', argsVariable: 'args' })
		).toThrow('Variable name must not be empty.');
	});
});
