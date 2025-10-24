import { buildWpTermQueryInstantiation } from '../factories/wpTermQuery';

describe('buildWpTermQueryInstantiation', () => {
	it('creates a WP_Term_Query instantiation without arguments', () => {
		const statement = buildWpTermQueryInstantiation({
			target: 'term_query',
		});

		expect(statement).toMatchObject({
			nodeType: 'Stmt_Expression',
			expr: {
				nodeType: 'Expr_Assign',
				var: { nodeType: 'Expr_Variable', name: 'term_query' },
				expr: {
					nodeType: 'Expr_New',
					class: { parts: ['WP_Term_Query'] },
					args: [],
				},
			},
		});
	});

	it('supports constructor arguments', () => {
		const statement = buildWpTermQueryInstantiation({
			target: '$query',
			argsVariable: '$args',
		});

		expect(statement).toMatchObject({
			nodeType: 'Stmt_Expression',
			expr: {
				nodeType: 'Expr_Assign',
				var: { nodeType: 'Expr_Variable', name: 'query' },
				expr: {
					nodeType: 'Expr_New',
					args: [
						{
							value: {
								nodeType: 'Expr_Variable',
								name: 'args',
							},
						},
					],
				},
			},
		});
	});

	it('throws when provided with an empty variable name', () => {
		expect(() =>
			buildWpTermQueryInstantiation({ target: '', argsVariable: 'args' })
		).toThrow('Variable name must not be empty.');
	});
});
