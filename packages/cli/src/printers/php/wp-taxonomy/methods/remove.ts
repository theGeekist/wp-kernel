import { createMethodTemplate, PHP_INDENT } from '../../template';
import { escapeSingleQuotes } from '../../utils';
import type { WpTaxonomyContext, WpTaxonomyRouteDefinition } from '../types';

export function createRemoveMethod(
	context: WpTaxonomyContext,
	definition: WpTaxonomyRouteDefinition
): string[] {
	const identityParam = context.identity.param;
	return createMethodTemplate({
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
				'$result = wp_delete_term( (int) $term->term_id, $taxonomy );'
			);
			body.line('if ( is_wp_error( $result ) ) {');
			body.line('        return $result;');
			body.line('}');
			body.line('if ( false === $result ) {');
			body.line(
				`        return new WP_Error( '${context.errorCode('delete_failed')}', 'Failed to delete ${escapeSingleQuotes(context.titleCaseName())} term.', array( 'status' => 500 ) );`
			);
			body.line('}');
			body.blank();
			body.line('return array(');
			body.line("        'deleted' => true,");
			body.line(
				`        'previous' => $this->prepare${context.pascalName}TermResponse( $term ),`
			);
			body.line(');');
		},
	});
}
