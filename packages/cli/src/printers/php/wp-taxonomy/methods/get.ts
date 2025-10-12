import { createMethodTemplate, PHP_INDENT } from '../../template';
import type { WpTaxonomyContext, WpTaxonomyRouteDefinition } from '../types';

export function createGetMethod(
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
				`        return new WP_Error( '${context.errorCode('not_found')}', 'Unable to locate ${context.titleCaseName()} term.', array( 'status' => 404 ) );`
			);
			body.line('}');
			body.blank();
			body.line(
				`return $this->prepare${context.pascalName}TermResponse( $term );`
			);
		},
	});
}
