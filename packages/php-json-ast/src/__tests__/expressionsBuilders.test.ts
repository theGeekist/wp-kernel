import {
	buildArg,
	buildArray,
	buildArrayDimFetch,
	buildArrayItem,
	buildArrowFunction,
	buildAssign,
	buildBinaryOperation,
	buildBooleanNot,
	buildClosure,
	buildClosureUse,
	buildFuncCall,
	buildIdentifier,
	buildInstanceof,
	buildName,
	buildNew,
	buildNull,
	buildNullsafeMethodCall,
	buildNullsafePropertyFetch,
	buildPropertyFetch,
	buildReturn,
	buildScalarBool,
	buildScalarCast,
	buildScalarInt,
	buildScalarString,
	buildStaticCall,
	buildTernary,
	buildVariable,
	buildMethodCall,
	buildArrayCast,
	type PhpExpr,
} from '../nodes';
import { buildParam } from '../nodes/params';

describe('expression builders', () => {
	it('builds array items with defaults and overrides', () => {
		const value = buildVariable('value');
		const defaultItem = buildArrayItem(value);

		expect(defaultItem.key).toBeNull();
		expect(defaultItem.byRef).toBe(false);
		expect(defaultItem.unpack).toBe(false);

		const key = buildVariable('key');
		const customItem = buildArrayItem(value, {
			key,
			byRef: true,
			unpack: true,
		});

		expect(customItem.key).toBe(key);
		expect(customItem.byRef).toBe(true);
		expect(customItem.unpack).toBe(true);
	});

	it('builds scalar constants', () => {
		expect(buildScalarBool(true).name.parts).toEqual(['true']);
		expect(buildScalarBool(false).name.parts).toEqual(['false']);
		expect(buildNull().name.parts).toEqual(['null']);
	});

	it('creates scalar casts for all supported kinds', () => {
		const expr = buildVariable('input');
		const mappings: Record<'int' | 'float' | 'string' | 'bool', string> = {
			int: 'Expr_Cast_Int',
			float: 'Expr_Cast_Double',
			string: 'Expr_Cast_String',
			bool: 'Expr_Cast_Bool',
		};

		for (const kind of Object.keys(mappings) as Array<
			keyof typeof mappings
		>) {
			const result = buildScalarCast(kind, expr);
			expect(result.nodeType).toBe(mappings[kind]);
			expect(result.expr).toBe(expr);
		}
	});

	it('builds closures and arrow functions with provided options', () => {
		const variable = buildVariable('value');
		const param = buildParam(variable, { byRef: true, variadic: true });
		const use = buildClosureUse(variable, { byRef: true });
		const defaultUse = buildClosureUse(variable);
		const returnType = buildName(['ResultType']);
		const expr: PhpExpr = buildBooleanNot(variable);

		const defaultClosure = buildClosure();
		expect(defaultClosure.static).toBe(false);
		expect(defaultClosure.byRef).toBe(false);
		expect(defaultClosure.params).toEqual([]);
		expect(defaultClosure.uses).toEqual([]);
		expect(defaultClosure.returnType).toBeNull();

		const closure = buildClosure({
			static: true,
			byRef: true,
			params: [param],
			uses: [use],
			returnType,
			stmts: [buildReturn(expr)],
			attrGroups: [],
		});

		expect(closure.static).toBe(true);
		expect(closure.byRef).toBe(true);
		expect(closure.params).toEqual([param]);
		expect(closure.uses).toEqual([use]);
		expect(defaultUse.byRef).toBe(false);
		expect(closure.returnType).toBe(returnType);
		expect(closure.stmts).toHaveLength(1);

		const minimalArrow = buildArrowFunction({ expr });
		expect(minimalArrow.static).toBe(false);
		expect(minimalArrow.byRef).toBe(false);
		expect(minimalArrow.params).toEqual([]);
		expect(minimalArrow.returnType).toBeNull();

		const arrow = buildArrowFunction({
			static: true,
			byRef: true,
			params: [param],
			returnType,
			expr,
			attrGroups: [],
		});

		expect(arrow.static).toBe(true);
		expect(arrow.byRef).toBe(true);
		expect(arrow.params).toEqual([param]);
		expect(arrow.returnType).toBe(returnType);
		expect(arrow.expr).toBe(expr);
	});

	it('builds ternary expressions with nullable middle expression', () => {
		const condition = buildScalarInt(1);
		const fallback = buildScalarString('fallback');

		const ternary = buildTernary(condition, null, fallback);

		expect(ternary.if).toBeNull();
		expect(ternary.else).toBe(fallback);
	});

	it('builds invocation and access helpers', () => {
		const variable = buildVariable('service');
		const method = buildIdentifier('perform');
		const args = [buildArg(buildScalarString('payload'))];

		const array = buildArray([buildArrayItem(buildScalarString('entry'))]);
		expect(array.items).toHaveLength(1);

		const dimFetch = buildArrayDimFetch(variable, null);
		expect(dimFetch.dim).toBeNull();

		const assign = buildAssign(variable, buildScalarString('value'));
		expect(assign.expr.nodeType).toBe('Scalar_String');

		const methodCall = buildMethodCall(variable, method, args);
		expect(methodCall.args).toEqual(args);
		const methodCallDefaultArgs = buildMethodCall(variable, method);
		expect(methodCallDefaultArgs.args).toEqual([]);

		const nullsafeMethod = buildNullsafeMethodCall(variable, method, args);
		expect(nullsafeMethod.nodeType).toBe('Expr_NullsafeMethodCall');
		const nullsafeDefault = buildNullsafeMethodCall(variable, method);
		expect(nullsafeDefault.args).toEqual([]);

		const staticCall = buildStaticCall(
			buildName(['Utility']),
			method,
			args
		);
		expect(staticCall.class.nodeType).toBe('Name');
		const staticCallDefault = buildStaticCall(
			buildName(['Utility']),
			method
		);
		expect(staticCallDefault.args).toEqual([]);

		const funcCall = buildFuncCall(buildName(['helper']), args);
		expect(funcCall.name.nodeType).toBe('Name');
		const funcCallDefault = buildFuncCall(buildName(['helper']));
		expect(funcCallDefault.args).toEqual([]);

		const newExpr = buildNew(buildName(['Example']), args);
		expect(newExpr.nodeType).toBe('Expr_New');
		const newExprDefault = buildNew(buildName(['Example']));
		expect(newExprDefault.args).toEqual([]);

		const property = buildPropertyFetch(variable, method);
		expect(property.nodeType).toBe('Expr_PropertyFetch');

		const nullsafeProperty = buildNullsafePropertyFetch(variable, method);
		expect(nullsafeProperty.nodeType).toBe('Expr_NullsafePropertyFetch');

		const binary = buildBinaryOperation(
			'Concat',
			buildScalarString('a'),
			buildScalarString('b')
		);
		expect(binary.nodeType).toBe('Expr_BinaryOp_Concat');

		const instanceOf = buildInstanceof(variable, buildName(['DateTime']));
		expect(instanceOf.class.nodeType).toBe('Name');

		const arrayCast = buildArrayCast(variable);
		expect(arrayCast.nodeType).toBe('Expr_Cast_Array');
	});
});
