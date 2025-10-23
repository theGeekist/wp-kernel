import {
	assembleMethodTemplate,
	PHP_INDENT,
	type PhpMethodBodyBuilder,
} from '../template';
import type { WpPostContext } from './context';
import type { WpPostRouteDefinition } from './types';
import { appendIdentitySlugAssignment } from './identity';
import { appendSupportedFieldAssignments } from './supports';

export function createCreateMethod(
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
		body: (body) => buildCreateMethodBody(context, body),
	});
}

function buildCreateMethodBody(
	context: WpPostContext,
	body: PhpMethodBodyBuilder
): void {
	body.line(`$post_type = $this->get${context.pascalName}PostType();`);
	body.blank();
	body.line("$status = $request->get_param( 'status' );");
	body.line(
		`$post_status = $this->normalise${context.pascalName}Status( $status );`
	);
	body.line('$post_data = array(');
	body.line("        'post_type' => $post_type,");
	body.line("        'post_status' => $post_status,");
	body.line(');');

	appendSupportedFieldAssignments(context, body);
	appendIdentitySlugAssignment(context, body);

	body.blank();
	body.line('$post_id = wp_insert_post( $post_data, true );');
	body.line('if ( is_wp_error( $post_id ) ) {');
	body.line('        return $post_id;');
	body.line('}');
	body.blank();
	body.line(`$this->sync${context.pascalName}Meta( $post_id, $request );`);
	body.line(
		`$taxonomy_result = $this->sync${context.pascalName}Taxonomies( $post_id, $request );`
	);
	body.line('if ( is_wp_error( $taxonomy_result ) ) {');
	body.line('        return $taxonomy_result;');
	body.line('}');
	body.blank();
	body.line('$post = get_post( $post_id );');
	body.line('if ( ! $post instanceof WP_Post ) {');
	body.line(
		`        return new WP_Error( '${context.errorCode('load_failed')}', 'Unable to load created ${context.titleCaseName()}.', array( 'status' => 500 ) );`
	);
	body.line('}');
	body.blank();
	body.line(
		`return $this->prepare${context.pascalName}Response( $post, $request );`
	);
}
