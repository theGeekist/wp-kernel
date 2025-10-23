import {
	assembleMethodTemplate,
	PHP_INDENT,
	type PhpMethodBodyBuilder,
} from '../template';
import type { WpPostContext } from './context';
import type { WpPostRouteDefinition } from './types';
import { appendMetaQueryBuilder } from './meta';
import { appendTaxonomyQueryBuilder } from './taxonomies';

export function createListMethod(
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
		body: (body) => buildListMethodBody(context, body),
	});
}

function buildListMethodBody(
	context: WpPostContext,
	body: PhpMethodBodyBuilder
): void {
	body.line(`$post_type = $this->get${context.pascalName}PostType();`);
	body.line(`$per_page = (int) $request->get_param( 'per_page' );`);
	body.line('if ( $per_page <= 0 ) {');
	body.line('        $per_page = 10;');
	body.line('}');
	body.line('if ( $per_page > 100 ) {');
	body.line('        $per_page = 100;');
	body.line('}');
	body.blank();

	if (context.statuses.length > 0) {
		body.line(`$statuses = $this->get${context.pascalName}Statuses();`);
	}

	body.line('$query_args = array(');
	body.line("        'post_type' => $post_type,");
	if (context.statuses.length > 0) {
		body.line("        'post_status' => $statuses,");
	} else {
		body.line("        'post_status' => 'any',");
	}
	body.line("        'fields' => 'ids',");
	body.line(
		"        'paged' => max( 1, (int) $request->get_param( 'page' ) ),"
	);
	body.line("        'posts_per_page' => $per_page,");
	body.line(');');
	body.blank();

	if (context.metaEntries.length > 0) {
		appendMetaQueryBuilder(context, body);
	}

	if (context.taxonomyEntries.length > 0) {
		appendTaxonomyQueryBuilder(context, body);
	}

	body.line('$query = new WP_Query( $query_args );');
	body.line('$items = array();');
	body.blank();
	body.line('foreach ( $query->posts as $post_id ) {');
	body.line('        $post = get_post( $post_id );');
	body.line('        if ( ! $post instanceof WP_Post ) {');
	body.line('                continue;');
	body.line('        }');
	body.blank();
	body.line(
		`        $items[] = $this->prepare${context.pascalName}Response( $post, $request );`
	);
	body.line('}');
	body.blank();
	body.line('return array(');
	body.line("        'items' => $items,");
	body.line("        'total' => (int) $query->found_posts,");
	body.line("        'pages' => (int) $query->max_num_pages,");
	body.line(');');
}
