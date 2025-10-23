import {
	assembleMethodTemplate,
	PHP_INDENT,
	type PhpMethodBodyBuilder,
} from '../template';
import type { WpPostContext } from './context';
import type { WpPostRouteDefinition } from './types';
import { appendIdentityValidation, appendIdentitySlugUpdate } from './identity';
import { appendSupportedFieldUpdates } from './supports';

export function createUpdateMethod(
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
		body: (body) => buildUpdateMethodBody(context, body),
	});
}

function buildUpdateMethodBody(
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
	body.line('$post_data = array(');
	body.line("        'ID' => $post->ID,");
	body.line(
		`        'post_type' => $this->get${context.pascalName}PostType(),`
	);
	body.line(');');
	body.blank();
	body.line("$status = $request->get_param( 'status' );");
	body.line('if ( null !== $status ) {');
	body.line(
		`        $post_data['post_status'] = $this->normalise${context.pascalName}Status( $status );`
	);
	body.line('}');
	body.blank();
	appendSupportedFieldUpdates(context, body);
	appendIdentitySlugUpdate(context, body);
	body.blank();
	body.line('$result = wp_update_post( $post_data, true );');
	body.line('if ( is_wp_error( $result ) ) {');
	body.line('        return $result;');
	body.line('}');
	body.blank();
	body.line(`$this->sync${context.pascalName}Meta( $post->ID, $request );`);
	body.line(
		`$taxonomy_result = $this->sync${context.pascalName}Taxonomies( $post->ID, $request );`
	);
	body.line('if ( is_wp_error( $taxonomy_result ) ) {');
	body.line('        return $taxonomy_result;');
	body.line('}');
	body.blank();
	body.line('$updated = get_post( $post->ID );');
	body.line('if ( ! $updated instanceof WP_Post ) {');
	body.line(
		`        return new WP_Error( '${context.errorCode('load_failed')}', 'Unable to load updated ${context.titleCaseName()}.', array( 'status' => 500 ) );`
	);
	body.line('}');
	body.blank();
	body.line(
		`return $this->prepare${context.pascalName}Response( $updated, $request );`
	);
}
