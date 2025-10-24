import { KernelError } from '@wpkernel/core/contracts';
import {
	buildScalarCast,
	buildBinaryOperation,
	normaliseVariableReference,
	buildVariableAssignment,
	printStatement,
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
				KernelError
			);
		});

		it('throws for sigils without identifiers', () => {
			expect(() => normaliseVariableReference('$')).toThrow(KernelError);
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
		const printable = printStatement(statement, 1);

		expect(statement.expr).toMatchObject({
			nodeType: 'Expr_Assign',
		});
		expect(printable.lines).toEqual(['        $result = 5;']);
	});

	it('builds assignment statements from normalised references', () => {
		const reference = normaliseVariableReference('$items');
		const statement = buildVariableAssignment(reference, buildScalarInt(3));
		const printable = printStatement(statement, 0);

		expect(statement.expr).toMatchObject({
			nodeType: 'Expr_Assign',
			var: { name: 'items' },
		});
		expect(printable.lines).toEqual(['$items = 3;']);
	});
});
