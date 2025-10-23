import { assembleMethodTemplate, PHP_INDENT } from '../../template';
import { escapeSingleQuotes } from '../../utils';
import type { WpTaxonomyContext, WpTaxonomyRouteDefinition } from '../types';

export function createUpdateMethod(
	context: WpTaxonomyContext,
	definition: WpTaxonomyRouteDefinition
): string[] {
	const identityParam = context.identity.param;
	return assembleMethodTemplate({
		signature: `public function ${definition.methodName}( WP_REST_Request $request )`,
		indentLevel: 1,
		indentUnit: PHP_INDENT,
		docblock: [
			`Handle [${definition.route.method}] ${definition.route.path}.`,
		],
		body: (body) => {
			body.line(`$taxonomy = $this->get${context.pascalName}Taxonomy();`);
			body.line(
				`$identity = $this->validate${context.pascalName}Identity( $request->get_param( '${identityParam}' ) );`
			);
			body.line('if ( is_wp_error( $identity ) ) {');
			body.line('        return $identity;');
			body.line('}');
			body.blank();
			body.line(
				`$term = $this->resolve${context.pascalName}Term( $identity );`
			);
			body.line('if ( ! ( $term instanceof WP_Term ) ) {');
			body.line(
				`        return new WP_Error( '${context.errorCode('not_found')}', 'Unable to locate ${escapeSingleQuotes(context.titleCaseName())} term.', array( 'status' => 404 ) );`
			);
			body.line('}');
			body.blank();
			body.line(
				`$args = $this->extract${context.pascalName}TermArgs( $request );`
			);
			body.line("$name = $request->get_param( 'name' );");
			body.line("if ( is_string( $name ) && '' !== trim( $name ) ) {");
			body.line("        $args['name'] = trim( (string) $name );");
			body.line('}');
			body.line('if ( empty( $args ) ) {');
			body.line(
				`        return $this->prepare${context.pascalName}TermResponse( $term );`
			);
			body.line('}');
			body.blank();
			body.line(
				'$result = wp_update_term( (int) $term->term_id, $taxonomy, $args );'
			);
			body.line('if ( is_wp_error( $result ) ) {');
			body.line('        return $result;');
			body.line('}');
			body.blank();
			body.line(
				"$term_id = isset( $result['term_id'] ) ? (int) $result['term_id'] : (int) $term->term_id;"
			);
			body.line('$updated = get_term( $term_id, $taxonomy );');
			body.line('if ( $updated instanceof WP_Term ) {');
			body.line(
				`        return $this->prepare${context.pascalName}TermResponse( $updated );`
			);
			body.line('}');
			body.blank();
			body.line(
				`return $this->prepare${context.pascalName}TermResponse( $term );`
			);
		},
	});
}
