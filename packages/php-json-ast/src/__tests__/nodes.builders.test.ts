import {
	buildArg,
	buildBinaryOperation,
	buildClassMethod,
	buildConst,
	buildContinue,
	buildDeclare,
	buildDeclareItem,
	buildForeach,
	buildIdentifier,
	buildName,
	buildNew,
	buildNullableType,
	buildPropertyHook,
	buildReturn,
	buildScalarFloat,
	buildScalarInt,
	buildScalarString,
	buildTernary,
	buildVariable,
} from '../nodes';
import { buildParam } from '../nodes/params';

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

	it('builds concatenation operations via typed primitive', () => {
		const operation = buildBinaryOperation(
			'Concat',
			buildScalarString('left'),
			buildScalarString('right')
		);

		expect(operation).toMatchObject({
			nodeType: 'Expr_BinaryOp_Concat',
			left: { nodeType: 'Scalar_String', value: 'left' },
			right: { nodeType: 'Scalar_String', value: 'right' },
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

		const byRefForeach = buildForeach(buildVariable('items'), {
			valueVar: buildVariable('item'),
			byRef: true,
			stmts: [],
		});

		expect(byRefForeach.byRef).toBe(true);
		expect(byRefForeach.keyVar).toBeNull();
	});

	it('builds continue statements', () => {
		const stmt = buildContinue();
		expect(stmt).toMatchObject({ nodeType: 'Stmt_Continue', num: null });

		const targeted = buildContinue(buildScalarInt(1));
		expect(targeted.num).toMatchObject({
			nodeType: 'Scalar_Int',
			value: 1,
		});
	});

	it('builds nullable types', () => {
		const type = buildNullableType(buildIdentifier('string'));
		expect(type).toMatchObject({
			nodeType: 'NullableType',
			type: { nodeType: 'Identifier', name: 'string' },
		});
	});

	it('builds class methods with optional configuration', () => {
		const name = buildIdentifier('execute');
		const defaultMethod = buildClassMethod(name);

		expect(defaultMethod.byRef).toBe(false);
		expect(defaultMethod.params).toEqual([]);

		const param = buildParam(buildVariable('value'), { byRef: true });
		const method = buildClassMethod(name, {
			byRef: true,
			flags: 3,
			params: [param],
			returnType: buildName(['Result']),
			stmts: [buildReturn(buildScalarInt(1))],
			attrGroups: [],
		});

		expect(method.byRef).toBe(true);
		expect(method.flags).toBe(3);
		expect(method.params).toEqual([param]);
		expect(method.returnType).toMatchObject({ parts: ['Result'] });
		expect(method.stmts).toHaveLength(1);
	});

	it('builds declare statements with optional blocks', () => {
		const declareItem = buildDeclareItem('ticks', buildScalarInt(1));
		const emptyDeclare = buildDeclare([declareItem]);
		expect(emptyDeclare.stmts).toBeNull();

		const blockDeclare = buildDeclare([declareItem], {
			stmts: [buildReturn(null)],
		});

		expect(blockDeclare.stmts).toHaveLength(1);
	});

	it('builds property hooks with defaults and overrides', () => {
		const name = buildIdentifier('get_value');
		const defaultHook = buildPropertyHook(name, null);
		expect(defaultHook.byRef).toBe(false);
		expect(defaultHook.params).toEqual([]);

		const hook = buildPropertyHook(name, [buildReturn(buildScalarInt(1))], {
			byRef: true,
			flags: 7,
			params: [buildParam(buildVariable('input'))],
		});

		expect(hook.byRef).toBe(true);
		expect(hook.flags).toBe(7);
		expect(hook.params).toHaveLength(1);
	});

	it('builds const scalars and floats', () => {
		const constant = buildConst(buildIdentifier('FOO'), buildScalarInt(5));
		expect(constant.value).toMatchObject({
			nodeType: 'Scalar_Int',
			value: 5,
		});

		const float = buildScalarFloat(3.14);
		expect(float).toMatchObject({ nodeType: 'Scalar_Float', value: 3.14 });
	});
});
