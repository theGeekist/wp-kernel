import { createPrintable, createScalarInt } from '@wpkernel/php-json-ast';
import { expression, renderPhpValue, variable } from '../phpValue';

describe('phpValue', () => {
	it('renders variable descriptors', () => {
		const rendered = renderPhpValue(variable('items'), 1);
		expect(rendered.lines).toEqual(['        $items']);
		expect(rendered.node).toMatchObject({ nodeType: 'Expr_Variable' });
	});

	it('renders expression descriptors with indentation', () => {
		const printable = createPrintable(createScalarInt(5), ['5']);
		const rendered = renderPhpValue(expression(printable), 2);
		expect(rendered.lines).toEqual(['                5']);
	});

	it('renders structured literals', () => {
		const rendered = renderPhpValue({ key: 'value' }, 1);
		expect(rendered.lines[0]).toBe('        [');
		expect(rendered.lines[rendered.lines.length - 1]).toBe('        ]');
	});
});
