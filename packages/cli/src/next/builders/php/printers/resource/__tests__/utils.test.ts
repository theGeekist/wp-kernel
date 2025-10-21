import { KernelError } from '@wpkernel/core/contracts';
import {
	buildScalarCast,
	buildBinaryOperation,
	indentLines,
	normaliseVariableReference,
} from '../utils';
import { createVariable, createScalarInt } from '../../../ast/nodes';

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
	});

	it('creates scalar casts', () => {
		const cast = buildScalarCast('int', createVariable('value'));
		expect(cast).toMatchObject({ nodeType: 'Expr_Cast_Int' });
	});

	it('creates binary operations', () => {
		const operation = buildBinaryOperation(
			'Greater',
			createVariable('left'),
			createScalarInt(10)
		);
		expect(operation).toMatchObject({
			nodeType: 'Expr_BinaryOp_Greater',
		});
	});

	it('indents lines', () => {
		expect(indentLines(['line'], '        ')).toEqual(['        line']);
	});
});
