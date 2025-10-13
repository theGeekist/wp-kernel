import { createMethodTemplate, PHP_INDENT } from '../template';
import { escapeSingleQuotes, toSnakeCase } from '../utils';
import type { WpPostContext } from './context';
import { appendMetaSanitizer } from './meta';

export function createHelperMethods(context: WpPostContext): string[][] {
	const helpers: string[][] = [];

	helpers.push(
		createMethodTemplate({
			signature: `private function get${context.pascalName}PostType(): string`,
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				body.line(
					`return '${escapeSingleQuotes(
						context.storage.postType ?? context.resource.name
					)}';`
				);
			},
		})
	);

	helpers.push(
		createMethodTemplate({
			signature: `private function get${context.pascalName}Statuses(): array`,
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				if (context.statuses.length === 0) {
					body.line('return array();');
					return;
				}

				const values = context.statuses
					.map((status) => `'${escapeSingleQuotes(status)}'`)
					.join(', ');
				body.line(`return array( ${values} );`);
			},
		})
	);

	helpers.push(
		createMethodTemplate({
			signature: `private function get${context.pascalName}DefaultStatus(): string`,
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				body.line(
					`return '${escapeSingleQuotes(context.defaultStatus)}';`
				);
			},
		})
	);

	helpers.push(
		createMethodTemplate({
			signature: `private function normalise${context.pascalName}Status( $status ): string`,
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				body.line(
					"if ( ! is_string( $status ) || '' === trim( $status ) ) {"
				);
				body.line(
					`        return $this->get${context.pascalName}DefaultStatus();`
				);
				body.line('}');
				body.line('$status = strtolower( trim( $status ) );');
				body.line(
					`$allowed = $this->get${context.pascalName}Statuses();`
				);
				body.line('if ( empty( $allowed ) ) {');
				body.line('        return $status;');
				body.line('}');
				body.line('if ( in_array( $status, $allowed, true ) ) {');
				body.line('        return $status;');
				body.line('}');
				body.line(
					`return $this->get${context.pascalName}DefaultStatus();`
				);
			},
		})
	);

	helpers.push(
		createMethodTemplate({
			signature: `private function resolve${context.pascalName}Post( $identity ): ?WP_Post`,
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				body.line(
					`$post_type = $this->get${context.pascalName}PostType();`
				);
				if (context.identity.type === 'number') {
					body.line('if ( is_numeric( $identity ) ) {');
					body.line('        $post = get_post( (int) $identity );');
					body.line(
						'        if ( $post instanceof WP_Post && $post->post_type === $post_type ) {'
					);
					body.line('                return $post;');
					body.line('        }');
					body.line('}');
				}
				body.line('if ( is_string( $identity ) ) {');
				body.line('        $candidate = trim( (string) $identity );');
				body.line("        if ( '' !== $candidate ) {");
				body.line(
					'                $post = get_page_by_path( $candidate, OBJECT, $post_type );'
				);
				body.line('                if ( $post instanceof WP_Post ) {');
				body.line('                        return $post;');
				body.line('                }');
				body.line(
					`                $statuses = $this->get${context.pascalName}Statuses();`
				);
				body.line('                if ( empty( $statuses ) ) {');
				body.line("                        $statuses = 'any';");
				body.line('                }');
				body.line('                $results = get_posts(');
				body.line('                        array(');
				body.line(
					"                                'name' => $candidate,"
				);
				body.line(
					`                                'post_type' => $post_type,`
				);
				body.line(
					"                                'post_status' => $statuses,"
				);
				body.line(
					"                                'posts_per_page' => 1,"
				);
				body.line('                        )');
				body.line('                );');
				body.line('                if ( ! empty( $results ) ) {');
				body.line('                        $post = $results[0];');
				body.line(
					'                        if ( ! ( $post instanceof WP_Post ) ) {'
				);
				body.line(
					'                                $post = get_post( $post );'
				);
				body.line('                        }');
				body.line(
					'                        if ( $post instanceof WP_Post ) {'
				);
				body.line('                                return $post;');
				body.line('                        }');
				body.line('                }');
				if (context.identity.param === 'uuid') {
					body.line('                $results = get_posts(');
					body.line('                        array(');
					body.line(
						`                                'post_type' => $post_type,`
					);
					body.line(
						"                                'post_status' => 'any',"
					);
					body.line(
						"                                'meta_key' => 'uuid',"
					);
					body.line(
						"                                'meta_value' => $candidate,"
					);
					body.line(
						"                                'posts_per_page' => 1,"
					);
					body.line('                        )');
					body.line('                );');
					body.line('                if ( ! empty( $results ) ) {');
					body.line(
						'                        $post = get_post( $results[0] );'
					);
					body.line(
						'                        if ( $post instanceof WP_Post ) {'
					);
					body.line('                                return $post;');
					body.line('                        }');
					body.line('                }');
				}
				body.line('        }');
				body.line('}');
				body.line('return null;');
			},
		})
	);

	helpers.push(
		createMethodTemplate({
			signature: `private function prepare${context.pascalName}Response( WP_Post $post, WP_REST_Request $request ): array`,
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				body.line('$data = array(');
				body.line("        'id' => (int) $post->ID,");
				if (context.identity.param === 'slug') {
					body.line("        'slug' => (string) $post->post_name,");
				}
				body.line("        'status' => (string) $post->post_status,");
				body.line(');');

				if (context.supports.has('title')) {
					body.line("$data['title'] = (string) $post->post_title;");
				}

				if (context.supports.has('editor')) {
					body.line(
						"$data['content'] = (string) $post->post_content;"
					);
				}

				if (context.supports.has('excerpt')) {
					body.line(
						"$data['excerpt'] = (string) $post->post_excerpt;"
					);
				}

				for (const [key, descriptor] of context.metaEntries) {
					const variable = `$${toSnakeCase(key)}Meta`;
					const fetchFlag =
						descriptor.single === false ? 'false' : 'true';
					body.line(
						`${variable} = get_post_meta( $post->ID, '${key}', ${fetchFlag} );`
					);
					appendMetaSanitizer(body, variable, descriptor, '');
					body.line(`$data['${key}'] = ${variable};`);
				}

				for (const [key, descriptor] of context.taxonomyEntries) {
					const variable = `$${toSnakeCase(key)}Terms`;
					body.line(
						`${variable} = wp_get_object_terms( $post->ID, '${descriptor.taxonomy}', array( 'fields' => 'ids' ) );`
					);
					body.line(`if ( is_wp_error( ${variable} ) ) {`);
					body.line(`        ${variable} = array();`);
					body.line('}');
					body.line(
						`${variable} = array_map( 'intval', (array) ${variable} );`
					);
					body.line(`$data['${key}'] = ${variable};`);
				}

				body.line('return $data;');
			},
		})
	);

	helpers.push(
		createMethodTemplate({
			signature: `private function sync${context.pascalName}Meta( int $post_id, WP_REST_Request $request ): void`,
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				if (context.metaEntries.length === 0) {
					body.line('unset( $post_id, $request );');
					body.line('return;');
					return;
				}

				for (const [key, descriptor] of context.metaEntries) {
					const variable = `$${toSnakeCase(key)}Meta`;
					body.line(`${variable} = $request->get_param( '${key}' );`);
					body.line(`if ( null !== ${variable} ) {`);
					appendMetaSanitizer(body, variable, descriptor, '        ');
					if (descriptor.single === false) {
						body.line(
							`        delete_post_meta( $post_id, '${key}' );`
						);
						body.line(
							`        foreach ( (array) ${variable} as $value ) {`
						);
						body.line(
							`                add_post_meta( $post_id, '${key}', $value );`
						);
						body.line('        }');
					} else {
						body.line(
							`        update_post_meta( $post_id, '${key}', ${variable} );`
						);
					}
					body.line('}');
				}
			},
		})
	);

	helpers.push(
		createMethodTemplate({
			signature: `private function sync${context.pascalName}Taxonomies( int $post_id, WP_REST_Request $request )`,
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				if (context.taxonomyEntries.length === 0) {
					body.line('unset( $post_id, $request );');
					body.line('return true;');
					return;
				}

				body.line('$result = true;');
				for (const [key, descriptor] of context.taxonomyEntries) {
					const variable = `$${toSnakeCase(key)}Terms`;
					body.line(`${variable} = $request->get_param( '${key}' );`);
					body.line(`if ( null !== ${variable} ) {`);
					body.line(`        if ( ! is_array( ${variable} ) ) {`);
					body.line(
						`                ${variable} = array( ${variable} );`
					);
					body.line('        }');
					body.line(
						`        ${variable} = array_filter( array_map( 'intval', (array) ${variable} ) );`
					);
					body.line('        $result = wp_set_object_terms(');
					body.line('                $post_id,');
					body.line(`                ${variable},`);
					body.line(`                '${descriptor.taxonomy}',`);
					body.line('                false');
					body.line('        );');
					body.line('        if ( is_wp_error( $result ) ) {');
					body.line('                return $result;');
					body.line('        }');
					body.line('}');
				}
				body.line('return $result;');
			},
		})
	);

	return helpers;
}
