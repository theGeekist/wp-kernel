import { assembleMethodTemplate, PHP_INDENT } from '../template';
import { escapeSingleQuotes } from '../utils';
import type { WpTaxonomyContext } from './types';

export function createHelperMethods(context: WpTaxonomyContext): string[][] {
	const helpers: string[][] = [];

	helpers.push(
		assembleMethodTemplate({
			signature: `private function get${context.pascalName}Taxonomy(): string`,
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				body.line(`return '${escapeSingleQuotes(context.taxonomy)}';`);
			},
		})
	);

	helpers.push(
		assembleMethodTemplate({
			signature: `private function prepare${context.pascalName}TermResponse( WP_Term $term ): array`,
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				body.line('return array(');
				body.line("        'id' => (int) $term->term_id,");
				body.line("        'slug' => (string) $term->slug,");
				body.line("        'name' => (string) $term->name,");
				body.line("        'taxonomy' => (string) $term->taxonomy,");
				body.line(
					`        'hierarchical' => ${context.hierarchical ? 'true' : 'false'},`
				);
				body.line(
					"        'description' => (string) $term->description,"
				);
				body.line("        'parent' => (int) $term->parent,");
				body.line("        'count' => (int) $term->count,");
				body.line(');');
			},
		})
	);

	helpers.push(
		assembleMethodTemplate({
			signature: `private function resolve${context.pascalName}Term( $identity ): ?WP_Term`,
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				body.line(
					`$taxonomy = $this->get${context.pascalName}Taxonomy();`
				);
				body.line('if ( is_int( $identity ) ) {');
				body.line('        $term = get_term( $identity, $taxonomy );');
				body.line('        if ( $term instanceof WP_Term ) {');
				body.line('                return $term;');
				body.line('        }');
				body.line('}');
				body.line('if ( is_string( $identity ) ) {');
				body.line('        $candidate = trim( (string) $identity );');
				body.line("        if ( '' !== $candidate ) {");
				body.line(
					"                $term = get_term_by( 'slug', $candidate, $taxonomy );"
				);
				body.line('                if ( $term instanceof WP_Term ) {');
				body.line('                        return $term;');
				body.line('                }');
				body.line(
					"                $term = get_term_by( 'name', $candidate, $taxonomy );"
				);
				body.line('                if ( $term instanceof WP_Term ) {');
				body.line('                        return $term;');
				body.line('                }');
				body.line('        }');
				body.line('}');
				body.line('return null;');
			},
		})
	);

	helpers.push(
		assembleMethodTemplate({
			signature: `private function extract${context.pascalName}TermArgs( WP_REST_Request $request ): array`,
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				body.line('$args = array();');
				body.line(
					"$description = $request->get_param( 'description' );"
				);
				body.line('if ( is_string( $description ) ) {');
				body.line("        $args['description'] = $description;");
				body.line('}');
				body.line("$slug = $request->get_param( 'slug' );");
				body.line(
					"if ( is_string( $slug ) && '' !== trim( $slug ) ) {"
				);
				body.line("        $args['slug'] = sanitize_title( $slug );");
				body.line('}');
				body.line("$parent = $request->get_param( 'parent' );");
				body.line('if ( null !== $parent ) {');
				body.line("        $args['parent'] = max( 0, (int) $parent );");
				body.line('}');
				body.line('return $args;');
			},
		})
	);

	helpers.push(
		assembleMethodTemplate({
			signature: `private function validate${context.pascalName}Identity( $value )`,
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				body.line('if ( null === $value ) {');
				body.line(
					`        return new WP_Error( '${context.errorCode('missing_identifier')}', '${escapeSingleQuotes(`Missing identifier for ${context.titleCaseName()}.`)}', array( 'status' => 400 ) );`
				);
				body.line('}');

				if (context.identity.type === 'number') {
					body.line(
						"if ( is_string( $value ) && '' === trim( $value ) ) {"
					);
					body.line(
						`        return new WP_Error( '${context.errorCode('missing_identifier')}', '${escapeSingleQuotes(`Missing identifier for ${context.titleCaseName()}.`)}', array( 'status' => 400 ) );`
					);
					body.line('}');
					body.line('if ( ! is_numeric( $value ) ) {');
					body.line(
						`        return new WP_Error( '${context.errorCode('invalid_identifier')}', '${escapeSingleQuotes(`Invalid identifier for ${context.titleCaseName()}.`)}', array( 'status' => 400 ) );`
					);
					body.line('}');
					body.line('$value = (int) $value;');
					body.line('if ( $value <= 0 ) {');
					body.line(
						`        return new WP_Error( '${context.errorCode('invalid_identifier')}', '${escapeSingleQuotes(`Invalid identifier for ${context.titleCaseName()}.`)}', array( 'status' => 400 ) );`
					);
					body.line('}');
					body.line('return $value;');
				} else {
					body.line(
						"if ( ! is_string( $value ) || '' === trim( $value ) ) {"
					);
					body.line(
						`        return new WP_Error( '${context.errorCode('missing_identifier')}', '${escapeSingleQuotes(`Missing identifier for ${context.titleCaseName()}.`)}', array( 'status' => 400 ) );`
					);
					body.line('}');
					body.line('return trim( (string) $value );');
				}
			},
		})
	);

	return helpers;
}
