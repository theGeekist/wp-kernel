import {
	PhpMethodBodyBuilder,
	PHP_INDENT,
} from '@wpkernel/php-json-ast/templates';
import { appendNotImplementedStub } from '../stubs';

function createRoute() {
	return {
		method: 'POST',
		path: '/kernel/v1/books',
		policy: undefined,
		hash: 'create',
		transport: 'local',
	};
}

describe('appendNotImplementedStub', () => {
	it('appends a TODO comment and WP_Error return statement', () => {
		const body = new PhpMethodBodyBuilder(PHP_INDENT, 1);

		appendNotImplementedStub({
			body,
			indent: PHP_INDENT,
			route: createRoute(),
		});

		expect(body.toLines()).toEqual([
			'        // TODO: Implement handler for [POST] /kernel/v1/books.',
			"        return new WP_Error( 501, 'Not Implemented' );",
		]);

		expect(body.toStatements()).toHaveLength(2);
	});
});
