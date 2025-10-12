import type { IRResource, IRRoute } from '../../ir';
import type { PrinterContext } from '../types';
import { type PhpFileBuilder } from './builder';
import {
	createMethodTemplate,
	PHP_INDENT,
	type PhpMethodBodyBuilder,
} from './template';

type WpPostStorage = Extract<
	NonNullable<IRResource['storage']>,
	{ mode: 'wp-post' }
>;

export interface WpPostRouteDefinition {
	route: IRRoute;
	methodName: string;
}

export function createWpPostHandlers(options: {
	builder: PhpFileBuilder;
	context: PrinterContext;
	resource: IRResource;
	routes: WpPostRouteDefinition[];
}): string[][] {
	if (options.resource.storage?.mode !== 'wp-post') {
		return [];
	}

	const generator = new WpPostControllerGenerator(options);
	return generator.generate();
}

class WpPostControllerGenerator {
	private readonly storage: WpPostStorage;
	private readonly pascalName: string;
	private readonly identityParam: string;
	private readonly identityType: 'number' | 'string';
	private readonly metaEntries: Array<[string, WpPostMetaDescriptor]>;
	private readonly taxonomyEntries: Array<[string, WpPostTaxonomyDescriptor]>;
	private readonly supports: Set<string>;
	private readonly statuses: string[];
	private readonly defaultStatus: string;

	public constructor(
		private readonly options: {
			builder: PhpFileBuilder;
			context: PrinterContext;
			resource: IRResource;
			routes: WpPostRouteDefinition[];
		}
	) {
		this.storage = options.resource.storage as WpPostStorage;
		this.pascalName = toPascalCase(options.resource.name);

		const identity = resolveIdentityConfig(options.resource);
		this.identityParam = identity.param;
		this.identityType = identity.type;

		this.metaEntries = Object.entries(this.storage.meta ?? {}) as Array<
			[string, WpPostMetaDescriptor]
		>;
		this.taxonomyEntries = Object.entries(
			this.storage.taxonomies ?? {}
		) as Array<[string, WpPostTaxonomyDescriptor]>;
		this.supports = new Set(this.storage.supports ?? []);
		this.statuses = Array.isArray(this.storage.statuses)
			? this.storage.statuses.filter(isNonEmptyString)
			: [];
		this.defaultStatus = this.statuses[0] ?? 'publish';

		this.options.builder.addUse('WP_Error');
		this.options.builder.addUse('WP_Post');
		this.options.builder.addUse('WP_Query');
		this.options.builder.addUse('WP_REST_Request');
	}

	public generate(): string[][] {
		const methods: string[][] = [];

		for (const definition of this.options.routes) {
			const handler = this.createRouteHandler(definition);
			if (handler) {
				methods.push(handler);
			}
		}

		methods.push(...this.createHelperMethods());

		return methods;
	}

	private createRouteHandler(
		definition: WpPostRouteDefinition
	): string[] | undefined {
		const kind = determineRouteKind(definition.route, this.identityParam);

		switch (kind) {
			case 'list':
				return this.createListMethod(definition);
			case 'get':
				return this.createGetMethod(definition);
			case 'create':
				return this.createCreateMethod(definition);
			case 'update':
				return this.createUpdateMethod(definition);
			case 'remove':
				return this.createDeleteMethod(definition);
			default:
				return this.createStubMethod(definition);
		}
	}

	private createListMethod(definition: WpPostRouteDefinition): string[] {
		return createMethodTemplate({
			signature: `public function ${definition.methodName}( WP_REST_Request $request )`,
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			docblock: [
				`Handle [${definition.route.method}] ${definition.route.path}.`,
			],
			body: (body) => this.buildListMethodBody(body),
		});
	}

	private createGetMethod(definition: WpPostRouteDefinition): string[] {
		return createMethodTemplate({
			signature: `public function ${definition.methodName}( WP_REST_Request $request )`,
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			docblock: [
				`Handle [${definition.route.method}] ${definition.route.path}.`,
			],
			body: (body) => this.buildGetMethodBody(body),
		});
	}

	private createCreateMethod(definition: WpPostRouteDefinition): string[] {
		return createMethodTemplate({
			signature: `public function ${definition.methodName}( WP_REST_Request $request )`,
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			docblock: [
				`Handle [${definition.route.method}] ${definition.route.path}.`,
			],
			body: (body) => this.buildCreateMethodBody(body),
		});
	}

	private createUpdateMethod(definition: WpPostRouteDefinition): string[] {
		return createMethodTemplate({
			signature: `public function ${definition.methodName}( WP_REST_Request $request )`,
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			docblock: [
				`Handle [${definition.route.method}] ${definition.route.path}.`,
			],
			body: (body) => this.buildUpdateMethodBody(body),
		});
	}

	private createDeleteMethod(definition: WpPostRouteDefinition): string[] {
		return createMethodTemplate({
			signature: `public function ${definition.methodName}( WP_REST_Request $request )`,
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			docblock: [
				`Handle [${definition.route.method}] ${definition.route.path}.`,
			],
			body: (body) => this.buildDeleteMethodBody(body),
		});
	}

	private createStubMethod(definition: WpPostRouteDefinition): string[] {
		return createMethodTemplate({
			signature: `public function ${definition.methodName}( WP_REST_Request $request )`,
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			docblock: [
				`Handle [${definition.route.method}] ${definition.route.path}.`,
			],
			body: (body) => {
				if (definition.route.path.includes(`:${this.identityParam}`)) {
					body.line(
						`$${this.identityParam} = $request->get_param( '${this.identityParam}' );`
					);
					body.blank();
				}

				body.line(
					`// TODO: Implement handler for [${definition.route.method}] ${definition.route.path}.`
				);
				body.line("return new WP_Error( 501, 'Not Implemented' );");
			},
		});
	}

	private buildListMethodBody(body: PhpMethodBodyBuilder): void {
		body.line(`$post_type = $this->get${this.pascalName}PostType();`);
		body.line(`$per_page = (int) $request->get_param( 'per_page' );`);
		body.line('if ( $per_page <= 0 ) {');
		body.line(`${PHP_INDENT}$per_page = 10;`);
		body.line('}');
		body.line('if ( $per_page > 100 ) {');
		body.line(`${PHP_INDENT}$per_page = 100;`);
		body.line('}');
		body.blank();

		if (this.statuses.length > 0) {
			body.line(`$statuses = $this->get${this.pascalName}Statuses();`);
		}

		body.line('$query_args = array(');
		body.line("        'post_type' => $post_type,");
		if (this.statuses.length > 0) {
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

		if (this.metaEntries.length > 0) {
			this.appendMetaQueryBuilder(body);
		}

		if (this.taxonomyEntries.length > 0) {
			this.appendTaxonomyQueryBuilder(body);
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
			`        $items[] = $this->prepare${this.pascalName}Response( $post, $request );`
		);
		body.line('}');
		body.blank();
		body.line('return array(');
		body.line("        'items' => $items,");
		body.line("        'total' => (int) $query->found_posts,");
		body.line("        'pages' => (int) $query->max_num_pages,");
		body.line(');');
	}

	private buildGetMethodBody(body: PhpMethodBodyBuilder): void {
		const identityVar = `$${this.identityParam}`;

		body.line(
			`${identityVar} = $request->get_param( '${this.identityParam}' );`
		);
		this.appendIdentityValidation(body, identityVar);
		body.blank();
		body.line(
			`$post = $this->resolve${this.pascalName}Post( ${identityVar} );`
		);
		body.line('if ( ! $post instanceof WP_Post ) {');
		body.line(
			`        return new WP_Error( '${this.errorCode('not_found')}', '${this.titleCaseName()} not found.', array( 'status' => 404 ) );`
		);
		body.line('}');
		body.blank();
		body.line(
			`return $this->prepare${this.pascalName}Response( $post, $request );`
		);
	}

	private buildCreateMethodBody(body: PhpMethodBodyBuilder): void {
		body.line(`$post_type = $this->get${this.pascalName}PostType();`);

		const statusVar = '$status';
		body.line(`${statusVar} = $request->get_param( 'status' );`);
		body.line(
			`$post_status = $this->normalise${this.pascalName}Status( ${statusVar} );`
		);
		body.line('$post_data = array(');
		body.line("        'post_type' => $post_type,");
		body.line("        'post_status' => $post_status,");
		body.line(');');

		this.appendSupportedFieldAssignments(body);
		this.appendIdentitySlugAssignment(body);

		body.blank();
		body.line('$post_id = wp_insert_post( $post_data, true );');
		body.line('if ( is_wp_error( $post_id ) ) {');
		body.line('        return $post_id;');
		body.line('}');
		body.blank();
		body.line(`$this->sync${this.pascalName}Meta( $post_id, $request );`);
		body.line(
			`$taxonomy_result = $this->sync${this.pascalName}Taxonomies( $post_id, $request );`
		);
		body.line('if ( is_wp_error( $taxonomy_result ) ) {');
		body.line('        return $taxonomy_result;');
		body.line('}');
		body.blank();
		body.line('$post = get_post( $post_id );');
		body.line('if ( ! $post instanceof WP_Post ) {');
		body.line(
			`        return new WP_Error( '${this.errorCode('load_failed')}', 'Unable to load created ${this.titleCaseName()}.', array( 'status' => 500 ) );`
		);
		body.line('}');
		body.blank();
		body.line(
			`return $this->prepare${this.pascalName}Response( $post, $request );`
		);
	}

	private buildUpdateMethodBody(body: PhpMethodBodyBuilder): void {
		const identityVar = `$${this.identityParam}`;

		body.line(
			`${identityVar} = $request->get_param( '${this.identityParam}' );`
		);
		this.appendIdentityValidation(body, identityVar);
		body.blank();
		body.line(
			`$post = $this->resolve${this.pascalName}Post( ${identityVar} );`
		);
		body.line('if ( ! $post instanceof WP_Post ) {');
		body.line(
			`        return new WP_Error( '${this.errorCode('not_found')}', '${this.titleCaseName()} not found.', array( 'status' => 404 ) );`
		);
		body.line('}');
		body.blank();
		body.line('$post_data = array(');
		body.line('        ' + "'ID' => $post->ID,");
		body.line(
			"        'post_type' => $this->get${this.pascalName}PostType(),"
		);
		body.line(');');

		body.line('$status = $request->get_param( ' + "'status'" + ' );');
		body.line('if ( null !== $status ) {');
		body.line(
			`        $post_data['post_status'] = $this->normalise${this.pascalName}Status( $status );`
		);
		body.line('}');

		this.appendSupportedFieldUpdates(body);
		this.appendIdentitySlugUpdate(body);

		body.blank();
		body.line('$result = wp_update_post( $post_data, true );');
		body.line('if ( is_wp_error( $result ) ) {');
		body.line('        return $result;');
		body.line('}');
		body.blank();
		body.line(`$this->sync${this.pascalName}Meta( $post->ID, $request );`);
		body.line(
			`$taxonomy_result = $this->sync${this.pascalName}Taxonomies( $post->ID, $request );`
		);
		body.line('if ( is_wp_error( $taxonomy_result ) ) {');
		body.line('        return $taxonomy_result;');
		body.line('}');
		body.blank();
		body.line('$updated = get_post( $post->ID );');
		body.line('if ( ! $updated instanceof WP_Post ) {');
		body.line(
			`        return new WP_Error( '${this.errorCode('load_failed')}', 'Unable to load updated ${this.titleCaseName()}.', array( 'status' => 500 ) );`
		);
		body.line('}');
		body.blank();
		body.line(
			`return $this->prepare${this.pascalName}Response( $updated, $request );`
		);
	}

	private buildDeleteMethodBody(body: PhpMethodBodyBuilder): void {
		const identityVar = `$${this.identityParam}`;

		body.line(
			`${identityVar} = $request->get_param( '${this.identityParam}' );`
		);
		this.appendIdentityValidation(body, identityVar);
		body.blank();
		body.line(
			`$post = $this->resolve${this.pascalName}Post( ${identityVar} );`
		);
		body.line('if ( ! $post instanceof WP_Post ) {');
		body.line(
			`        return new WP_Error( '${this.errorCode('not_found')}', '${this.titleCaseName()} not found.', array( 'status' => 404 ) );`
		);
		body.line('}');
		body.blank();
		body.line(
			`$previous = $this->prepare${this.pascalName}Response( $post, $request );`
		);
		body.line('$deleted = wp_delete_post( $post->ID, true );');
		body.line('if ( false === $deleted ) {');
		body.line(
			`        return new WP_Error( '${this.errorCode('delete_failed')}', 'Unable to delete ${this.titleCaseName()}.', array( 'status' => 500 ) );`
		);
		body.line('}');
		body.blank();
		body.line('return array(');
		body.line("        'deleted' => true,");
		body.line("        'id' => (int) $post->ID,");
		body.line("        'previous' => $previous,");
		body.line(');');
	}

	private appendMetaQueryBuilder(body: PhpMethodBodyBuilder): void {
		body.line('$meta_query = array();');

		for (const [key, descriptor] of this.metaEntries) {
			const variable = `$${toSnakeCase(key)}Meta`;
			body.line(`${variable} = $request->get_param( '${key}' );`);
			body.line(`if ( null !== ${variable} ) {`);
			if (descriptor.single === false) {
				body.line(`        if ( ! is_array( ${variable} ) ) {`);
				body.line(
					`                ${variable} = array( ${variable} );`
				);
				body.line('        }');
				body.line(
					`        ${variable} = array_values( (array) ${variable} );`
				);
				body.line(`        if ( ! empty( ${variable} ) ) {`);
				body.line('                $meta_query[] = array(');
				body.line(`                        'key' => '${key}',`);
				body.line(`                        'value' => ${variable},`);
				body.line("                        'compare' => 'IN',");
				body.line('                );');
				body.line('        }');
			} else {
				body.line('        $meta_query[] = array(');
				body.line(`                'key' => '${key}',`);
				body.line(`                'value' => ${variable},`);
				body.line('        );');
			}
			body.line('}');
		}

		body.line('if ( ! empty( $meta_query ) ) {');
		body.line("        $query_args['meta_query'] = $meta_query;");
		body.line('}');
		body.blank();
	}

	private appendTaxonomyQueryBuilder(body: PhpMethodBodyBuilder): void {
		body.line('$tax_query = array();');

		for (const [key, descriptor] of this.taxonomyEntries) {
			const variable = `$${toSnakeCase(key)}Terms`;
			body.line(`${variable} = $request->get_param( '${key}' );`);
			body.line(`if ( null !== ${variable} ) {`);
			body.line(`        if ( ! is_array( ${variable} ) ) {`);
			body.line(`                ${variable} = array( ${variable} );`);
			body.line('        }');
			body.line(
				`        ${variable} = array_filter( array_map( 'intval', (array) ${variable} ) );`
			);
			body.line(`        if ( ! empty( ${variable} ) ) {`);
			body.line('                $tax_query[] = array(');
			body.line(
				`                        'taxonomy' => '${descriptor.taxonomy}',`
			);
			body.line("                        'field' => 'term_id',");
			body.line(`                        'terms' => ${variable},`);
			body.line('                );');
			body.line('        }');
			body.line('}');
		}

		body.line('if ( ! empty( $tax_query ) ) {');
		body.line("        $query_args['tax_query'] = $tax_query;");
		body.line('}');
		body.blank();
	}

	private appendIdentityValidation(
		body: PhpMethodBodyBuilder,
		variable: string
	): void {
		if (this.identityType === 'number') {
			body.line(`if ( null === ${variable} ) {`);
			body.line(
				`        return new WP_Error( '${this.errorCode('missing_identifier')}', 'Missing identifier for ${this.titleCaseName()}.', array( 'status' => 400 ) );`
			);
			body.line('}');
			body.line(`${variable} = (int) ${variable};`);
			body.line(`if ( ${variable} <= 0 ) {`);
			body.line(
				`        return new WP_Error( '${this.errorCode('invalid_identifier')}', 'Invalid identifier for ${this.titleCaseName()}.', array( 'status' => 400 ) );`
			);
			body.line('}');
		} else {
			body.line(
				`if ( ! is_string( ${variable} ) || '' === trim( ${variable} ) ) {`
			);
			body.line(
				`        return new WP_Error( '${this.errorCode('missing_identifier')}', 'Missing identifier for ${this.titleCaseName()}.', array( 'status' => 400 ) );`
			);
			body.line('}');
			body.line(`${variable} = trim( (string) ${variable} );`);
		}
	}

	private appendSupportedFieldAssignments(body: PhpMethodBodyBuilder): void {
		if (this.supports.has('title')) {
			body.line(`$title = $request->get_param( 'title' );`);
			body.line('if ( is_string( $title ) ) {');
			body.line("        $post_data['post_title'] = $title;");
			body.line('}');
		}

		if (this.supports.has('editor')) {
			body.line(`$content = $request->get_param( 'content' );`);
			body.line('if ( is_string( $content ) ) {');
			body.line("        $post_data['post_content'] = $content;");
			body.line('}');
		}

		if (this.supports.has('excerpt')) {
			body.line(`$excerpt = $request->get_param( 'excerpt' );`);
			body.line('if ( is_string( $excerpt ) ) {');
			body.line("        $post_data['post_excerpt'] = $excerpt;");
			body.line('}');
		}
	}

	private appendSupportedFieldUpdates(body: PhpMethodBodyBuilder): void {
		if (this.supports.has('title')) {
			body.line(`$title = $request->get_param( 'title' );`);
			body.line('if ( is_string( $title ) ) {');
			body.line("        $post_data['post_title'] = $title;");
			body.line('}');
		}

		if (this.supports.has('editor')) {
			body.line(`$content = $request->get_param( 'content' );`);
			body.line('if ( is_string( $content ) ) {');
			body.line("        $post_data['post_content'] = $content;");
			body.line('}');
		}

		if (this.supports.has('excerpt')) {
			body.line(`$excerpt = $request->get_param( 'excerpt' );`);
			body.line('if ( is_string( $excerpt ) ) {');
			body.line("        $post_data['post_excerpt'] = $excerpt;");
			body.line('}');
		}
	}

	private appendIdentitySlugAssignment(body: PhpMethodBodyBuilder): void {
		if (this.identityParam !== 'slug') {
			return;
		}

		body.line(`$slug = $request->get_param( 'slug' );`);
		body.line("if ( is_string( $slug ) && '' !== trim( $slug ) ) {");
		body.line("        $post_data['post_name'] = sanitize_title( $slug );");
		body.line('}');
	}

	private appendIdentitySlugUpdate(body: PhpMethodBodyBuilder): void {
		if (this.identityParam !== 'slug') {
			return;
		}

		body.line(`$slug = $request->get_param( 'slug' );`);
		body.line("if ( is_string( $slug ) && '' !== trim( $slug ) ) {");
		body.line("        $post_data['post_name'] = sanitize_title( $slug );");
		body.line('}');
	}

	private appendMetaSanitizer(
		body: PhpMethodBodyBuilder,
		variable: string,
		descriptor: WpPostMetaDescriptor,
		indent: string
	): void {
		if (descriptor.single === false && descriptor.type !== 'array') {
			body.line(`${indent}if ( ! is_array( ${variable} ) ) {`);
			body.line(`${indent}${indent}${variable} = array( ${variable} );`);
			body.line(`${indent}}`);
			body.line(
				`${indent}${variable} = array_values( (array) ${variable} );`
			);
			body.line(
				`${indent}foreach ( ${variable} as $meta_index => $meta_value ) {`
			);
			this.appendMetaSanitizerValue(
				body,
				'$meta_value',
				descriptor,
				`${indent}${indent}`
			);
			body.line(
				`${indent}${indent}${variable}[ $meta_index ] = $meta_value;`
			);
			body.line(`${indent}}`);
			return;
		}

		this.appendMetaSanitizerValue(body, variable, descriptor, indent);
	}

	private appendMetaSanitizerValue(
		body: PhpMethodBodyBuilder,
		variable: string,
		descriptor: WpPostMetaDescriptor,
		indent: string
	): void {
		switch (descriptor.type) {
			case 'integer':
				body.line(
					`${indent}${variable} = is_numeric( ${variable} ) ? (int) ${variable} : 0;`
				);
				break;
			case 'number':
				body.line(
					`${indent}${variable} = is_numeric( ${variable} ) ? (float) ${variable} : 0.0;`
				);
				break;
			case 'boolean':
				body.line(
					`${indent}${variable} = rest_sanitize_boolean( ${variable} );`
				);
				break;
			case 'array':
				body.line(
					`${indent}${variable} = array_values( (array) ${variable} );`
				);
				break;
			case 'object':
				body.line(
					`${indent}${variable} = is_array( ${variable} ) ? ${variable} : array();`
				);
				break;
			default:
				body.line(
					`${indent}${variable} = is_string( ${variable} ) ? ${variable} : (string) ${variable};`
				);
				break;
		}
	}

	private createHelperMethods(): string[][] {
		const helpers: string[][] = [];

		helpers.push(
			createMethodTemplate({
				signature: `private function get${this.pascalName}PostType(): string`,
				indentLevel: 1,
				indentUnit: PHP_INDENT,
				body: (body) => {
					body.line(
						`return '${escapeSingleQuotes(
							this.storage.postType ?? this.options.resource.name
						)}';`
					);
				},
			})
		);

		helpers.push(
			createMethodTemplate({
				signature: `private function get${this.pascalName}Statuses(): array`,
				indentLevel: 1,
				indentUnit: PHP_INDENT,
				body: (body) => {
					if (this.statuses.length === 0) {
						body.line('return array();');
						return;
					}

					const values = this.statuses
						.map((status) => `'${escapeSingleQuotes(status)}'`)
						.join(', ');
					body.line(`return array( ${values} );`);
				},
			})
		);

		helpers.push(
			createMethodTemplate({
				signature: `private function get${this.pascalName}DefaultStatus(): string`,
				indentLevel: 1,
				indentUnit: PHP_INDENT,
				body: (body) => {
					body.line(
						`return '${escapeSingleQuotes(this.defaultStatus)}';`
					);
				},
			})
		);

		helpers.push(
			createMethodTemplate({
				signature: `private function normalise${this.pascalName}Status( $status ): string`,
				indentLevel: 1,
				indentUnit: PHP_INDENT,
				body: (body) => {
					body.line(
						"if ( ! is_string( $status ) || '' === trim( $status ) ) {"
					);
					body.line(
						`        return $this->get${this.pascalName}DefaultStatus();`
					);
					body.line('}');
					body.line('$status = strtolower( trim( $status ) );');
					body.line(
						'$allowed = $this->get' +
							this.pascalName +
							'Statuses();'
					);
					body.line('if ( empty( $allowed ) ) {');
					body.line('        return $status;');
					body.line('}');
					body.line('if ( in_array( $status, $allowed, true ) ) {');
					body.line('        return $status;');
					body.line('}');
					body.line(
						`return $this->get${this.pascalName}DefaultStatus();`
					);
				},
			})
		);

		helpers.push(
			createMethodTemplate({
				signature: `private function resolve${this.pascalName}Post( $identity ): ?WP_Post`,
				indentLevel: 1,
				indentUnit: PHP_INDENT,
				body: (body) => {
					body.line(
						`$post_type = $this->get${this.pascalName}PostType();`
					);
					body.line('if ( is_numeric( $identity ) ) {');
					body.line('        $post = get_post( (int) $identity );');
					body.line(
						'        if ( $post instanceof WP_Post && $post->post_type === $post_type ) {'
					);
					body.line('                return $post;');
					body.line('        }');
					body.line('}');
					body.line('if ( is_string( $identity ) ) {');
					body.line(
						'        $candidate = trim( (string) $identity );'
					);
					body.line("        if ( '' !== $candidate ) {");
					body.line(
						'                $post = get_page_by_path( $candidate, OBJECT, $post_type );'
					);
					body.line(
						'                if ( $post instanceof WP_Post ) {'
					);
					body.line('                        return $post;');
					body.line('                }');
					if (this.identityParam === 'uuid') {
						body.line('                $results = get_posts(');
						body.line('                        array(');
						body.line(
							"                                'post_type' => $post_type,"
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
						body.line(
							'                if ( ! empty( $results ) ) {'
						);
						body.line(
							'                        $post = get_post( $results[0] );'
						);
						body.line(
							'                        if ( $post instanceof WP_Post ) {'
						);
						body.line(
							'                                return $post;'
						);
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
				signature: `private function prepare${this.pascalName}Response( WP_Post $post, WP_REST_Request $request ): array`,
				indentLevel: 1,
				indentUnit: PHP_INDENT,
				body: (body) => {
					body.line('$data = array(');
					body.line("        'id' => (int) $post->ID,");
					if (this.identityParam === 'slug') {
						body.line(
							"        'slug' => (string) $post->post_name,"
						);
					}
					body.line(
						"        'status' => (string) $post->post_status,"
					);
					body.line(');');

					if (this.supports.has('title')) {
						body.line(
							"$data['title'] = (string) $post->post_title;"
						);
					}
					if (this.supports.has('editor')) {
						body.line(
							"$data['content'] = (string) $post->post_content;"
						);
					}
					if (this.supports.has('excerpt')) {
						body.line(
							"$data['excerpt'] = (string) $post->post_excerpt;"
						);
					}

					for (const [key, descriptor] of this.metaEntries) {
						const variable = `$${toSnakeCase(key)}Meta`;
						const fetchFlag =
							descriptor.single === false ? 'false' : 'true';
						body.line(
							`${variable} = get_post_meta( $post->ID, '${key}', ${fetchFlag} );`
						);
						this.appendMetaSanitizer(
							body,
							variable,
							descriptor,
							''
						);
						body.line(`$data['${key}'] = ${variable};`);
					}

					for (const [key, descriptor] of this.taxonomyEntries) {
						const variable = `$${toSnakeCase(key)}Terms`;
						body.line(
							`${variable} = wp_get_object_terms( $post->ID, '${descriptor.taxonomy}', array( 'fields' => 'ids' ) );`
						);
						body.line('if ( is_wp_error( ' + variable + ' ) ) {');
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
				signature: `private function sync${this.pascalName}Meta( int $post_id, WP_REST_Request $request ): void`,
				indentLevel: 1,
				indentUnit: PHP_INDENT,
				body: (body) => {
					if (this.metaEntries.length === 0) {
						body.line('unset( $post_id, $request );');
						body.line('return;');
						return;
					}

					for (const [key, descriptor] of this.metaEntries) {
						const variable = `$${toSnakeCase(key)}Meta`;
						body.line(
							`${variable} = $request->get_param( '${key}' );`
						);
						body.line(`if ( null !== ${variable} ) {`);
						this.appendMetaSanitizer(
							body,
							variable,
							descriptor,
							'        '
						);
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
				signature: `private function sync${this.pascalName}Taxonomies( int $post_id, WP_REST_Request $request )`,
				indentLevel: 1,
				indentUnit: PHP_INDENT,
				body: (body) => {
					if (this.taxonomyEntries.length === 0) {
						body.line('unset( $post_id, $request );');
						body.line('return true;');
						return;
					}

					body.line('$result = true;');
					for (const [key, descriptor] of this.taxonomyEntries) {
						const variable = `$${toSnakeCase(key)}Terms`;
						body.line(
							`${variable} = $request->get_param( '${key}' );`
						);
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

	private errorCode(suffix: string): string {
		return `wpk_${toSnakeCase(this.options.resource.name)}_${suffix}`;
	}

	private titleCaseName(): string {
		return this.pascalName;
	}
}

type WpPostMetaDescriptor = {
	type: 'string' | 'integer' | 'number' | 'boolean' | 'array' | 'object';
	single?: boolean;
};

type WpPostTaxonomyDescriptor = {
	taxonomy: string;
	hierarchical?: boolean;
	register?: boolean;
};

type RouteKind = 'list' | 'get' | 'create' | 'update' | 'remove';

function determineRouteKind(
	route: IRRoute,
	identityParam: string
): RouteKind | undefined {
	switch (route.method) {
		case 'GET':
			return route.path.includes(`:${identityParam}`) ? 'get' : 'list';
		case 'POST':
			return 'create';
		case 'PUT':
		case 'PATCH':
			return 'update';
		case 'DELETE':
			return 'remove';
		default:
			return undefined;
	}
}

function resolveIdentityConfig(resource: IRResource): {
	type: 'number' | 'string';
	param: string;
} {
	const identity = resource.identity;
	if (!identity) {
		return { type: 'number', param: 'id' };
	}

	const param =
		identity.param ?? (identity.type === 'number' ? 'id' : 'slug');
	return { type: identity.type, param };
}

function toPascalCase(value: string): string {
	return value
		.split(/[^a-zA-Z0-9]+/u)
		.filter(Boolean)
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join('');
}

function toSnakeCase(value: string): string {
	return value
		.replace(/[^a-zA-Z0-9]+/g, '_')
		.replace(/([a-z0-9])([A-Z])/g, '$1_$2')
		.toLowerCase()
		.replace(/^_+|_+$/g, '')
		.replace(/_+/g, '_');
}

function escapeSingleQuotes(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}
