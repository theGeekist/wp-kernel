import { WPKernelError } from '@wpkernel/core/contracts';
import {
	buildScalarCast,
	buildBinaryOperation,
	normaliseVariableReference,
	buildVariableAssignment,
} from '../utils';
import { buildScalarInt, buildVariable } from '@wpkernel/php-json-ast';

describe('resource utils', () => {
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
