import { KernelError } from '@wpkernel/core/contracts';
import {
	createIdentifier,
	createName,
	createParam,
	createVariable,
} from '../../../../ast/nodes';
import {
	createMethodTemplate,
	PHP_INDENT,
	type PhpMethodBodyBuilder,
	type PhpMethodTemplate,
} from '../../../../ast/templates';
import { PHP_METHOD_MODIFIER_PRIVATE } from '../../../../ast/modifiers';
import { escapeSingleQuotes, toSnakeCase } from '../../../../ast/utils';
import type { IRResource } from '../../../../../../../ir/types';
import type { ResolvedIdentity } from '../../../identity';

type WpPostStorage = Extract<
	NonNullable<IRResource['storage']>,
	{ mode: 'wp-post' }
>;

type WpPostMetaDescriptor = NonNullable<WpPostStorage['meta']>[string];
type WpPostTaxonomyDescriptor = NonNullable<
	WpPostStorage['taxonomies']
>[string];

export interface MutationHelperOptions {
	readonly resource: IRResource;
	readonly pascalName: string;
	readonly identity: ResolvedIdentity;
}

export function syncWpPostMeta(
	options: MutationHelperOptions
): PhpMethodTemplate {
	const storage = ensureStorage(options.resource);
	const metaEntries = Object.entries(storage.meta ?? {}) as Array<
		[string, WpPostMetaDescriptor]
	>;

	return createMethodTemplate({
		signature: `private function sync${options.pascalName}Meta( int $post_id, WP_REST_Request $request ): void`,
		indentLevel: 1,
		indentUnit: PHP_INDENT,
		body: (body) => {
			if (metaEntries.length === 0) {
				body.line('unset( $post_id, $request );');
				body.line('return;');
				return;
			}

			for (const [key, descriptor] of metaEntries) {
				const variable = `$${toSnakeCase(key)}Meta`;
				const escapedKey = escapeSingleQuotes(key);
				body.line(
					`${variable} = $request->get_param( '${escapedKey}' );`
				);
				body.line(`if ( null !== ${variable} ) {`);
				appendMetaSanitizer(body, variable, descriptor);

				if (descriptor?.single === false) {
					body.line(
						`        delete_post_meta( $post_id, '${escapedKey}' );`
					);
					body.line(
						`        foreach ( (array) ${variable} as $value ) {`
					);
					body.line(
						`                add_post_meta( $post_id, '${escapedKey}', $value );`
					);
					body.line('        }');
				} else {
					body.line(
						`        update_post_meta( $post_id, '${escapedKey}', ${variable} );`
					);
				}

				body.line('}');
			}
		},
		ast: {
			flags: PHP_METHOD_MODIFIER_PRIVATE,
			params: [
				createParam(createVariable('post_id'), {
					type: createIdentifier('int'),
				}),
				createParam(createVariable('request'), {
					type: createName(['WP_REST_Request']),
				}),
			],
			returnType: createIdentifier('void'),
		},
	});
}

export function syncWpPostTaxonomies(
	options: MutationHelperOptions
): PhpMethodTemplate {
	const storage = ensureStorage(options.resource);
	const taxonomyEntries = Object.entries(storage.taxonomies ?? {}) as Array<
		[string, WpPostTaxonomyDescriptor]
	>;

	return createMethodTemplate({
		signature: `private function sync${options.pascalName}Taxonomies( int $post_id, WP_REST_Request $request )`,
		indentLevel: 1,
		indentUnit: PHP_INDENT,
		body: (body) => {
			if (taxonomyEntries.length === 0) {
				body.line('unset( $post_id, $request );');
				body.line('return true;');
				return;
			}

			body.line('$result = true;');

			for (const [key, descriptor] of taxonomyEntries) {
				const variable = `$${toSnakeCase(key)}Terms`;
				const escapedKey = escapeSingleQuotes(key);
				const taxonomy = escapeSingleQuotes(descriptor.taxonomy);
				body.line(
					`${variable} = $request->get_param( '${escapedKey}' );`
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
				body.line(`                '${taxonomy}',`);
				body.line('                false');
				body.line('        );');
				body.line('        if ( is_wp_error( $result ) ) {');
				body.line('                return $result;');
				body.line('        }');
				body.line('}');
			}

			body.line('return $result;');
		},
		ast: {
			flags: PHP_METHOD_MODIFIER_PRIVATE,
			params: [
				createParam(createVariable('post_id'), {
					type: createIdentifier('int'),
				}),
				createParam(createVariable('request'), {
					type: createName(['WP_REST_Request']),
				}),
			],
		},
	});
}

export function prepareWpPostResponse(
	options: MutationHelperOptions
): PhpMethodTemplate {
	const storage = ensureStorage(options.resource);
	const metaEntries = Object.entries(storage.meta ?? {}) as Array<
		[string, WpPostMetaDescriptor]
	>;
	const taxonomyEntries = Object.entries(storage.taxonomies ?? {}) as Array<
		[string, WpPostTaxonomyDescriptor]
	>;
	const supports = new Set(storage.supports ?? []);

	return createMethodTemplate({
		signature: `private function prepare${options.pascalName}Response( WP_Post $post, WP_REST_Request $request ): array`,
		indentLevel: 1,
		indentUnit: PHP_INDENT,
		body: (body) => {
			body.line('$data = array(');
			body.line("        'id' => (int) $post->ID,");
			if (options.identity.param === 'slug') {
				body.line("        'slug' => (string) $post->post_name,");
			}
			body.line("        'status' => (string) $post->post_status,");
			body.line(');');

			if (supports.has('title')) {
				body.line("$data['title'] = (string) $post->post_title;");
			}

			if (supports.has('editor')) {
				body.line("$data['content'] = (string) $post->post_content;");
			}

			if (supports.has('excerpt')) {
				body.line("$data['excerpt'] = (string) $post->post_excerpt;");
			}

			for (const [key, descriptor] of metaEntries) {
				const variable = `$${toSnakeCase(key)}Meta`;
				const escapedKey = escapeSingleQuotes(key);
				const fetchFlag =
					descriptor?.single === false ? 'false' : 'true';
				body.line(
					`${variable} = get_post_meta( $post->ID, '${escapedKey}', ${fetchFlag} );`
				);
				if (descriptor) {
					appendMetaSanitizer(body, variable, descriptor);
				}
				body.line(`$data['${escapedKey}'] = ${variable};`);
			}

			for (const [key, descriptor] of taxonomyEntries) {
				const variable = `$${toSnakeCase(key)}Terms`;
				const escapedKey = escapeSingleQuotes(key);
				const taxonomy = escapeSingleQuotes(descriptor.taxonomy);
				body.line(
					`${variable} = wp_get_object_terms( $post->ID, '${taxonomy}', array( 'fields' => 'ids' ) );`
				);
				body.line(`if ( is_wp_error( ${variable} ) ) {`);
				body.line(`        ${variable} = array();`);
				body.line('}');
				body.line(
					`${variable} = array_map( 'intval', (array) ${variable} );`
				);
				body.line(`$data['${escapedKey}'] = ${variable};`);
			}

			body.line('return $data;');
		},
		ast: {
			flags: PHP_METHOD_MODIFIER_PRIVATE,
			params: [
				createParam(createVariable('post'), {
					type: createName(['WP_Post']),
				}),
				createParam(createVariable('request'), {
					type: createName(['WP_REST_Request']),
				}),
			],
			returnType: createIdentifier('array'),
		},
	});
}

function ensureStorage(resource: IRResource): WpPostStorage {
	const storage = resource.storage;
	if (!storage || storage.mode !== 'wp-post') {
		throw new KernelError('DeveloperError', {
			message: 'Resource must use wp-post storage.',
			context: { name: resource.name },
		});
	}

	return storage;
}

function appendMetaSanitizer(
	body: PhpMethodBodyBuilder,
	variable: string,
	descriptor: WpPostMetaDescriptor
): void {
	if (descriptor?.single === false && descriptor.type !== 'array') {
		body.line(`        if ( ! is_array( ${variable} ) ) {`);
		body.line(`                ${variable} = array( ${variable} );`);
		body.line('        }');
		body.line(`        ${variable} = array_values( (array) ${variable} );`);
		body.line(
			`        foreach ( ${variable} as $meta_index => $meta_value ) {`
		);
		appendMetaSanitizerValue(
			body,
			'$meta_value',
			descriptor,
			'                '
		);
		body.line(`                ${variable}[ $meta_index ] = $meta_value;`);
		body.line('        }');
		return;
	}

	appendMetaSanitizerValue(body, variable, descriptor, '        ');
}

function appendMetaSanitizerValue(
	body: PhpMethodBodyBuilder,
	variable: string,
	descriptor: WpPostMetaDescriptor,
	indent: string
): void {
	switch (descriptor.type) {
		case 'integer': {
			body.line(
				`${indent}${variable} = is_numeric( ${variable} ) ? (int) ${variable} : 0;`
			);
			break;
		}
		case 'number': {
			body.line(
				`${indent}${variable} = is_numeric( ${variable} ) ? (float) ${variable} : 0.0;`
			);
			break;
		}
		case 'boolean': {
			body.line(
				`${indent}${variable} = rest_sanitize_boolean( ${variable} );`
			);
			break;
		}
		case 'array': {
			body.line(
				`${indent}${variable} = array_values( (array) ${variable} );`
			);
			break;
		}
		case 'object': {
			body.line(
				`${indent}${variable} = is_array( ${variable} ) ? ${variable} : array();`
			);
			break;
		}
		default: {
			body.line(
				`${indent}${variable} = is_string( ${variable} ) ? ${variable} : (string) ${variable};`
			);
		}
	}
}
