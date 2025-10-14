import {
	createMethodTemplate,
	PHP_INDENT,
	type PhpMethodBodyBuilder,
} from '../template';
import type { WpPostContext } from './context';
import type { WpPostRouteDefinition } from './types';
import { appendIdentityValidation } from './identity';

export function createDeleteMethod(
	context: WpPostContext,
	definition: WpPostRouteDefinition
): string[] {
	return createMethodTemplate({
		signature: `public function ${definition.methodName}( WP_REST_Request $request )`,
		indentLevel: 1,
		indentUnit: PHP_INDENT,
		docblock: [
			`Handle [${definition.route.method}] ${definition.route.path}.`,
		],
		body: (body) => buildDeleteMethodBody(context, body),
	});
}

function buildDeleteMethodBody(
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
		`$previous = $this->prepare${context.pascalName}Response( $post, $request );`
	);
	body.line('$deleted = wp_delete_post( $post->ID, true );');
	body.line('if ( false === $deleted ) {');
	body.line(
		`        return new WP_Error( '${context.errorCode('delete_failed')}', 'Unable to delete ${context.titleCaseName()}.', array( 'status' => 500 ) );`
	);
	body.line('}');
	body.blank();
	body.line('return array(');
	body.line("        'deleted' => true,");
	body.line("        'id' => (int) $post->ID,");
	body.line("        'previous' => $previous,");
	body.line(');');
}
