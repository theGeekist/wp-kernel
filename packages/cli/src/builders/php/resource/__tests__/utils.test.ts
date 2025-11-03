import { WPKernelError } from '@wpkernel/core/contracts';
import {
	buildScalarCast,
	buildBinaryOperation,
	normaliseVariableReference,
	buildVariableAssignment,
} from '../utils';
import * as resourceUtils from '../utils';
import {
	appendStatementsWithSpacing as astAppendStatementsWithSpacing,
	buildArrayDimFetch as astBuildArrayDimFetch,
	buildArrayInitialiserStatement as astBuildArrayInitialiserStatement,
	buildArrayLiteral as astBuildArrayLiteral,
	buildBinaryOperation as astBuildBinaryOperation,
	buildBooleanNot as astBuildBooleanNot,
	buildForeachStatement as astBuildForeachStatement,
	buildFunctionCall as astBuildFunctionCall,
	buildFunctionCallAssignmentStatement as astBuildFunctionCallAssignmentStatement,
	buildIfStatementNode as astBuildIfStatementNode,
	buildInstanceof as astBuildInstanceof,
	buildMethodCallAssignmentStatement as astBuildMethodCallAssignmentStatement,
	buildMethodCallExpression as astBuildMethodCallExpression,
	buildPropertyFetch as astBuildPropertyFetch,
	buildReturnVoid as astBuildReturnVoid,
	buildScalarCast as astBuildScalarCast,
	buildVariableAssignment as astBuildVariableAssignment,
	normaliseVariableReference as astNormaliseVariableReference,
} from '@wpkernel/wp-json-ast';
import { buildScalarInt, buildVariable } from '@wpkernel/php-json-ast';

describe('resource utils', () => {
	describe('re-export surface', () => {
		it('mirrors wp-json-ast helpers', () => {
			expect(resourceUtils.appendStatementsWithSpacing).toBe(
				astAppendStatementsWithSpacing
			);
			expect(resourceUtils.buildArrayDimFetch).toBe(
				astBuildArrayDimFetch
			);
			expect(resourceUtils.buildArrayInitialiserStatement).toBe(
				astBuildArrayInitialiserStatement
			);
			expect(resourceUtils.buildArrayLiteral).toBe(astBuildArrayLiteral);
			expect(resourceUtils.buildBinaryOperation).toBe(
				astBuildBinaryOperation
			);
			expect(resourceUtils.buildBooleanNot).toBe(astBuildBooleanNot);
			expect(resourceUtils.buildForeachStatement).toBe(
				astBuildForeachStatement
			);
			expect(resourceUtils.buildFunctionCall).toBe(astBuildFunctionCall);
			expect(resourceUtils.buildFunctionCallAssignmentStatement).toBe(
				astBuildFunctionCallAssignmentStatement
			);
			expect(resourceUtils.buildIfStatementNode).toBe(
				astBuildIfStatementNode
			);
			expect(resourceUtils.buildInstanceof).toBe(astBuildInstanceof);
			expect(resourceUtils.buildMethodCallAssignmentStatement).toBe(
				astBuildMethodCallAssignmentStatement
			);
			expect(resourceUtils.buildMethodCallExpression).toBe(
				astBuildMethodCallExpression
			);
			expect(resourceUtils.buildPropertyFetch).toBe(
				astBuildPropertyFetch
			);
			expect(resourceUtils.buildReturnVoid).toBe(astBuildReturnVoid);
			expect(resourceUtils.buildScalarCast).toBe(astBuildScalarCast);
			expect(resourceUtils.buildVariableAssignment).toBe(
				astBuildVariableAssignment
			);
			expect(resourceUtils.normaliseVariableReference).toBe(
				astNormaliseVariableReference
			);
		});
	});

	describe('normaliseVariableReference', () => {
		it('returns raw and display names for bare identifiers', () => {
			expect(normaliseVariableReference('query')).toEqual({
				raw: 'query',
				display: '$query',
			});
		});

		it('preserves leading sigils', () => {
			expect(normaliseVariableReference('$items')).toEqual({
				raw: 'items',
				display: '$items',
			});
		});

		it('throws for empty names', () => {
			expect(() => normaliseVariableReference('   ')).toThrow(
				WPKernelError
			);
		});

		it('throws for sigils without identifiers', () => {
			expect(() => normaliseVariableReference('$')).toThrow(
				WPKernelError
			);
		});
	});

	it('creates scalar casts', () => {
		const cast = buildScalarCast('int', buildVariable('value'));
		expect(cast).toMatchObject({ nodeType: 'Expr_Cast_Int' });
	});

	it('creates binary operations', () => {
		const operation = buildBinaryOperation(
			'Greater',
			buildVariable('left'),
			buildScalarInt(10)
		);
		expect(operation).toMatchObject({
			nodeType: 'Expr_BinaryOp_Greater',
		});
	});

	it('builds assignment statements from raw identifiers', () => {
		const reference = normaliseVariableReference('result');
		const statement = buildVariableAssignment(reference, buildScalarInt(5));

		expect(statement).toMatchObject({
			nodeType: 'Stmt_Expression',
			expr: {
				nodeType: 'Expr_Assign',
				var: { nodeType: 'Expr_Variable', name: 'result' },
				expr: { nodeType: 'Scalar_Int', value: 5 },
			},
		});
	});

	it('builds assignment statements from normalised references', () => {
		const reference = normaliseVariableReference('$items');
		const statement = buildVariableAssignment(reference, buildScalarInt(3));

		expect(statement).toMatchObject({
			nodeType: 'Stmt_Expression',
			expr: {
				nodeType: 'Expr_Assign',
				var: { nodeType: 'Expr_Variable', name: 'items' },
			},
		});
	});
});
