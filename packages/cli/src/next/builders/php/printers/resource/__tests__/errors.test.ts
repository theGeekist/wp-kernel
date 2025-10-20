import { createWpErrorReturn } from '../errors';

describe('resource error helpers', () => {
	it('renders a WP_Error return with status metadata', () => {
		const printable = createWpErrorReturn({
			indentLevel: 2,
			code: 'demo_error',
			message: 'Demo message.',
			status: 418,
		});

		expect(printable.lines).toEqual([
			"                return new WP_Error( 'demo_error', 'Demo message.', array( 'status' => 418 ) );",
		]);
	});
});
