import {
	assembleMethodTemplate,
	PHP_INDENT,
	type PhpMethodBodyBuilder,
} from '../template';
import type { WpPostContext } from './context';
import type { WpPostRouteDefinition } from './types';
import { appendIdentityValidation } from './identity';

export function createGetMethod(
	context: WpPostContext,
	definition: WpPostRouteDefinition
): string[] {
	return assembleMethodTemplate({
		signature: `public function ${definition.methodName}( WP_REST_Request $request )`,
		indentLevel: 1,
		indentUnit: PHP_INDENT,
		docblock: [
			`Handle [${definition.route.method}] ${definition.route.path}.`,
		],
		body: (body) => buildGetMethodBody(context, body),
	});
}

function buildGetMethodBody(
	context: WpPostContext,
	body: PhpMethodBodyBuilder
): void {
	const identityVar = `$${context.identity.param}`;
	body.line(
		`${identityVar} = $request->get_param( '${context.identity.param}' );`
	);
	appendIdentityValidation(context, body, identityVar);
	body.blank();
	body.line(
		`$post = $this->resolve${context.pascalName}Post( ${identityVar} );`
	);
	body.line('if ( ! $post instanceof WP_Post ) {');
	body.line(
		`        return new WP_Error( '${context.errorCode('not_found')}', '${context.titleCaseName()} not found.', array( 'status' => 404 ) );`
	);
	body.line('}');
	body.blank();
	body.line(
		`return $this->prepare${context.pascalName}Response( $post, $request );`
	);
}
