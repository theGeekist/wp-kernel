import {
	buildArg,
	buildBinaryOperation,
	buildContinue,
	buildForeach,
	buildIdentifier,
	buildName,
	buildNew,
	buildNullableType,
	buildScalarInt,
	buildScalarString,
	buildTernary,
	buildVariable,
} from '../nodes';

describe('node builders', () => {
	it('builds new expressions', () => {
		const expr = buildNew(buildName(['WP_Query']), [
			buildArg(buildVariable('args')),
		]);

		expect(expr).toMatchObject({
			nodeType: 'Expr_New',
			class: { parts: ['WP_Query'] },
		});
		expect(expr.args).toHaveLength(1);
	});

	it('builds binary operations with canonical node types', () => {
		const operation = buildBinaryOperation(
			'Greater',
			buildVariable('count'),
			buildScalarInt(0)
		);

		expect(operation).toMatchObject({
			nodeType: 'Expr_BinaryOp_Greater',
			left: { nodeType: 'Expr_Variable', name: 'count' },
			right: { nodeType: 'Scalar_Int', value: 0 },
		});
	});

	it('builds ternary expressions', () => {
		const ternary = buildTernary(
			buildVariable('condition'),
			buildScalarString('if'),
			buildScalarString('else')
		);

		expect(ternary).toMatchObject({
			nodeType: 'Expr_Ternary',
			cond: { nodeType: 'Expr_Variable', name: 'condition' },
			if: { nodeType: 'Scalar_String', value: 'if' },
			else: { nodeType: 'Scalar_String', value: 'else' },
		});
	});

	it('builds foreach statements', () => {
		const foreach = buildForeach(buildVariable('items'), {
			valueVar: buildVariable('item'),
			keyVar: buildVariable('key'),
			stmts: [
				buildForeach(buildVariable('nested'), {
					valueVar: buildVariable('entry'),
					stmts: [],
				}),
			],
		});

		expect(foreach).toMatchObject({
			nodeType: 'Stmt_Foreach',
			keyVar: { nodeType: 'Expr_Variable', name: 'key' },
			valueVar: { nodeType: 'Expr_Variable', name: 'item' },
		});
		expect(foreach.stmts).toHaveLength(1);
	});

	it('builds continue statements', () => {
		const stmt = buildContinue();
		expect(stmt).toMatchObject({ nodeType: 'Stmt_Continue', num: null });
	});

	it('builds nullable types', () => {
		const type = buildNullableType(buildIdentifier('string'));
		expect(type).toMatchObject({
			nodeType: 'NullableType',
			type: { nodeType: 'Identifier', name: 'string' },
		});
	});
});
