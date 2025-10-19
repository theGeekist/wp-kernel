import { KernelError } from '@wpkernel/core/contracts';
import {
	createPhpReturn,
	createPhpExpression,
	renderPhpReturn,
} from '../valueRenderers';

describe('valueRenderers', () => {
	it('creates printable return statements for scalars', () => {
		const printable = createPhpReturn('demo', 1);
		expect(printable.lines).toEqual(["        return 'demo';"]);
		expect(printable.node.expr).toMatchObject({
			nodeType: 'Scalar_String',
		});

		const rendered = renderPhpReturn(true, 0);
		expect(rendered).toEqual(['return true;']);
	});

	it('renders indexed arrays with nested expressions', () => {
		const printable = createPhpExpression([1, 'two', [false]], 0);
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
		const printable = createPhpExpression(
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
		const numeric = createPhpExpression(42, 0);
		expect(numeric.lines).toEqual(['42']);

		const floating = createPhpExpression(3.14, 0);
		expect(floating.lines).toEqual(['3.14']);

		const truthy = createPhpExpression(true, 0);
		expect(truthy.lines).toEqual(['true']);

		const bigintPrintable = createPhpExpression(BigInt(99), 0);
		expect(bigintPrintable.lines).toEqual(['99']);
	});

	it('throws when encountering unsupported values', () => {
		expect(() => createPhpExpression(Symbol('demo'), 0)).toThrow(
			KernelError
		);
		expect(() => createPhpExpression(Number.POSITIVE_INFINITY, 0)).toThrow(
			KernelError
		);
	});
});
