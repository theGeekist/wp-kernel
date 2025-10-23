import { assembleMethodTemplate, PHP_INDENT } from '../../template';
import type { WpTaxonomyContext, WpTaxonomyRouteDefinition } from '../types';

export function createListMethod(
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
			body.line("$per_page = (int) $request->get_param( 'per_page' );");
			body.line('if ( $per_page <= 0 ) {');
			body.line('        $per_page = 10;');
			body.line('}');
			body.line('if ( $per_page > 100 ) {');
			body.line('        $per_page = 100;');
			body.line('}');
			body.blank();
			body.line("$page = (int) $request->get_param( 'page' );");
			body.line('if ( $page <= 0 ) {');
			body.line('        $page = 1;');
			body.line('}');
			body.blank();
			body.line('$query_args = array(');
			body.line("        'taxonomy' => $taxonomy,");
			body.line("        'hide_empty' => false,");
			body.line(');');
			body.blank();
			body.line('$extra_args = $request->get_params();');
			body.line('foreach ( $extra_args as $key => $value ) {');
			body.line(
				"        if ( in_array( $key, array( 'page', 'per_page' ), true ) ) {"
			);
			body.line('                continue;');
			body.line('        }');
			body.line('        $query_args[ $key ] = $value;');
			body.line('}');
			body.blank();
			body.line("$query_args['number'] = $per_page;");
			body.line("$query_args['offset'] = ( $page - 1 ) * $per_page;");
			body.blank();
			body.line('$term_query = new WP_Term_Query();');
			body.line('$results = $term_query->query( $query_args );');
			body.line('if ( is_wp_error( $results ) ) {');
			body.line('        return $results;');
			body.line('}');
			body.blank();
			body.line('$items = array();');
			body.line('foreach ( $results as $term ) {');
			body.line('        if ( $term instanceof WP_Term ) {');
			body.line(
				`                $items[] = $this->prepare${context.pascalName}TermResponse( $term );`
			);
			body.line('        }');
			body.line('}');
			body.blank();
			body.line('$total = (int) count( $term_query->get_terms() );');
			body.line('$pages = (int) ceil( $total / max( 1, $per_page ) );');
			body.blank();
			body.line('return array(');
			body.line("        'items' => $items,");
			body.line("        'total' => $total,");
			body.line("        'pages' => $pages,");
			body.line(');');
		},
	});
}
