import { KernelError } from '@wpkernel/core/contracts';
import {
	buildScalarCast,
	buildBinaryOperation,
	indentLines,
	normaliseVariableReference,
} from '../utils';
import { buildVariable, buildScalarInt } from '@wpkernel/php-json-ast';

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

	it('indents lines', () => {
		expect(indentLines(['line'], '        ')).toEqual(['        line']);
	});
});
