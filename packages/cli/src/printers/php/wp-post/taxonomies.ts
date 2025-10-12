import type { PhpMethodBodyBuilder } from '../template';
import type { WpPostContext } from './context';
import { toSnakeCase } from './utils';

export function appendTaxonomyQueryBuilder(
	context: WpPostContext,
	body: PhpMethodBodyBuilder
): void {
	body.line('$tax_query = array();');

	for (const [key, descriptor] of context.taxonomyEntries) {
		const variable = `$${toSnakeCase(key)}Terms`;
		body.line(`${variable} = $request->get_param( '${key}' );`);
		body.line(`if ( null !== ${variable} ) {`);
		body.line(`        if ( ! is_array( ${variable} ) ) {`);
		body.line(`                ${variable} = array( ${variable} );`);
		body.line('        }');
		body.line(
			`        ${variable} = array_filter( array_map( 'intval', (array) ${variable} ) );`
		);
		body.line('        if ( empty( ${variable} ) ) {');
		body.line('                continue;');
		body.line('        }');
		body.line('        $tax_query[] = array(');
		body.line(`                'taxonomy' => '${descriptor.taxonomy}',`);
		body.line("                'field' => 'term_id',");
		body.line(`                'terms' => ${variable},`);
		body.line('        );');
		body.line('}');
	}

	body.line('if ( ! empty( $tax_query ) ) {');
	body.line("        $query_args['tax_query'] = $tax_query;");
	body.line('}');
	body.blank();
}
