import { KernelError } from '../KernelError';
import {
	buildPhpReturnPrintable,
	buildPhpExpressionPrintable,
	renderPhpReturn,
} from '../valueRenderers';

describe('valueRenderers', () => {
	it('creates printable return statements for scalars', () => {
		const printable = buildPhpReturnPrintable('demo', 1);
		expect(printable.lines).toEqual(["        return 'demo';"]);
		expect(printable.node.expr).toMatchObject({
			nodeType: 'Scalar_String',
		});

		const rendered = renderPhpReturn(true, 0);
		expect(rendered).toEqual(['return true;']);
	});

	it('renders indexed arrays with nested expressions', () => {
		const printable = buildPhpExpressionPrintable([1, 'two', [false]], 0);
		expect(printable.lines).toEqual([
			'[',
			'        1,',
			"        'two',",
			'        [',
			'                false,',
			'        ],',
			']',
		]);
		expect(printable.node).toMatchObject({ nodeType: 'Expr_Array' });
	});

	it('renders associative arrays with escaped keys', () => {
		const printable = buildPhpExpressionPrintable(
			{
				label: 'demo',
				"inner'value": { nested: null },
			},
			0
		);

		expect(printable.lines).toEqual([
			'[',
			"        'label' => 'demo',",
			"        'inner\\'value' => [",
			"                'nested' => null,",
			'        ],',
			']',
		]);
		expect(printable.node).toMatchObject({ nodeType: 'Expr_Array' });
	});

	it('supports numeric and boolean scalars', () => {
		const numeric = buildPhpExpressionPrintable(42, 0);
		expect(numeric.lines).toEqual(['42']);

		const floating = buildPhpExpressionPrintable(3.14, 0);
		expect(floating.lines).toEqual(['3.14']);

		const truthy = buildPhpExpressionPrintable(true, 0);
		expect(truthy.lines).toEqual(['true']);

		const bigintPrintable = buildPhpExpressionPrintable(BigInt(99), 0);
		expect(bigintPrintable.lines).toEqual(["'99'"]);
	});

	it('throws when encountering unsupported values', () => {
		expect(() => buildPhpExpressionPrintable(Symbol('demo'), 0)).toThrow(
			KernelError
		);
		expect(() =>
			buildPhpExpressionPrintable(Number.POSITIVE_INFINITY, 0)
		).toThrow(KernelError);
	});
});
