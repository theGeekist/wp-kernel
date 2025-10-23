import { assembleMethodTemplate, PHP_INDENT } from '../../template';
import { escapeSingleQuotes } from '../../utils';
import type { WpTaxonomyContext, WpTaxonomyRouteDefinition } from '../types';

export function createCreateMethod(
	context: WpTaxonomyContext,
	definition: WpTaxonomyRouteDefinition
): string[] {
	return assembleMethodTemplate({
		signature: `public function ${definition.methodName}( WP_REST_Request $request )`,
		indentLevel: 1,
		indentUnit: PHP_INDENT,
		docblock: [
			`Handle [${definition.route.method}] ${definition.route.path}.`,
		],
		body: (body) => {
			body.line(`$taxonomy = $this->get${context.pascalName}Taxonomy();`);
			body.line("$name = $request->get_param( 'name' );");
			body.line("if ( ! is_string( $name ) || '' === trim( $name ) ) {");
			body.line(
				`        return new WP_Error( '${context.errorCode('missing_name')}', 'Missing name for ${escapeSingleQuotes(context.titleCaseName())} term.', array( 'status' => 400 ) );`
			);
			body.line('}');
			body.line('$name = trim( (string) $name );');
			body.blank();
			body.line(
				`$args = $this->extract${context.pascalName}TermArgs( $request );`
			);
			body.line('$result = wp_insert_term( $name, $taxonomy, $args );');
			body.line('if ( is_wp_error( $result ) ) {');
			body.line('        return $result;');
			body.line('}');
			body.blank();
			body.line(
				"$term_id = isset( $result['term_id'] ) ? (int) $result['term_id'] : 0;"
			);
			body.line('if ( $term_id <= 0 ) {');
			body.line(
				`        return new WP_Error( '${context.errorCode('create_failed')}', 'Failed to create ${escapeSingleQuotes(context.titleCaseName())} term.', array( 'status' => 500 ) );`
			);
			body.line('}');
			body.blank();
			body.line('$term = get_term( $term_id, $taxonomy );');
			body.line('if ( $term instanceof WP_Term ) {');
			body.line(
				`        return $this->prepare${context.pascalName}TermResponse( $term );`
			);
			body.line('}');
			body.blank();
			body.line(
				`return new WP_Error( '${context.errorCode('not_found')}', 'Unable to locate ${escapeSingleQuotes(context.titleCaseName())} term after creation.', array( 'status' => 500 ) );`
			);
		},
	});
}
