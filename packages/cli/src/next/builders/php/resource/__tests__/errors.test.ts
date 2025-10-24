import { createWpErrorReturn } from '../errors';

describe('resource error helpers', () => {
	it('renders a WP_Error return with status metadata', () => {
		const printable = createWpErrorReturn({
			indentLevel: 2,
			code: 'demo_error',
			message: 'Demo message.',
			status: 418,
		});

		expect(printable.node).toMatchObject({
			nodeType: 'Stmt_Return',
			expr: { nodeType: 'Expr_New', class: { parts: ['WP_Error'] } },
		});

		const args = printable.node.expr?.args ?? [];
		expect(args).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					value: expect.objectContaining({
						nodeType: 'Scalar_String',
						value: 'demo_error',
					}),
				}),
				expect.objectContaining({
					value: expect.objectContaining({
						nodeType: 'Scalar_String',
						value: 'Demo message.',
					}),
				}),
				expect.objectContaining({
					value: expect.objectContaining({
						nodeType: 'Expr_Array',
						items: expect.arrayContaining([
							expect.objectContaining({
								key: expect.objectContaining({
									nodeType: 'Scalar_String',
									value: 'status',
								}),
								value: expect.objectContaining({
									nodeType: 'Scalar_LNumber',
									value: 418,
								}),
							}),
						]),
					}),
				}),
			])
		);
	});
});
