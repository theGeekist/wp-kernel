import { createWpQueryInstantiation } from '../factories/wpQuery';

describe('createWpQueryInstantiation', () => {
	it('creates a WP_Query instantiation with default formatting', () => {
		const printable = createWpQueryInstantiation({
			target: 'query',
			argsVariable: 'query_args',
		});

		expect(printable.lines).toEqual([
			'$query = new WP_Query( $query_args );',
		]);
		expect(printable.node.expr).toMatchObject({
			nodeType: 'Expr_Assign',
			expr: {
				nodeType: 'Expr_New',
				class: { parts: ['WP_Query'] },
			},
		});
	});

	it('supports custom indentation and variable prefixes', () => {
		const printable = createWpQueryInstantiation({
			target: '$customQuery',
			argsVariable: '$args',
			indentLevel: 2,
			indentUnit: '  ',
		});

		expect(printable.lines).toEqual([
			'    $customQuery = new WP_Query( $args );',
		]);
		expect(printable.node.expr).toMatchObject({
			nodeType: 'Expr_Assign',
			expr: {
				nodeType: 'Expr_New',
				args: [expect.anything()],
			},
		});
	});

	it('throws when provided with empty variable names', () => {
		expect(() =>
			createWpQueryInstantiation({ target: '', argsVariable: 'args' })
		).toThrow('Variable name must not be empty.');
	});
});
