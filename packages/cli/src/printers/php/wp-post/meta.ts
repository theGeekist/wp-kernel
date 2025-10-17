import type { PhpMethodBodyBuilder } from '../template';
import type { WpPostContext } from './context';
import type { WpPostMetaDescriptor } from './types';
import { toSnakeCase } from '../utils';

export function appendMetaQueryBuilder(
	context: WpPostContext,
	body: PhpMethodBodyBuilder
): void {
	body.line('$meta_query = array();');

	for (const [key, descriptor] of context.metaEntries) {
		const variable = `$${toSnakeCase(key)}Meta`;
		body.line(`${variable} = $request->get_param( '${key}' );`);
		body.line(`if ( null !== ${variable} ) {`);
		if (descriptor.single === false) {
			body.line(`        if ( ! is_array( ${variable} ) ) {`);
			body.line(`                ${variable} = array( ${variable} );`);
			body.line('        }');
			body.line(
				`        ${variable} = array_values( (array) ${variable} );`
			);
			body.line(
				`        ${variable} = array_filter( ${variable}, static function ( $value ) {`
			);
			body.line("                return '' !== trim( (string) $value );");
			body.line('        } );');
			body.line(`        if ( ! empty( ${variable} ) ) {`);
			body.line('                $meta_query[] = array(');
			body.line(`                        'key' => '${key}',`);
			body.line("                        'compare' => 'IN',");
			body.line(`                        'value' => ${variable},`);
			body.line('                );');
			body.line('        }');
		} else {
			body.line(`        if ( is_scalar( ${variable} ) ) {`);
			body.line(
				`                ${variable} = trim( (string) ${variable} );`
			);
			body.line(`                if ( '' !== ${variable} ) {`);
			body.line('                        $meta_query[] = array(');
			body.line(`                                'key' => '${key}',`);
			body.line("                                'compare' => '=',");
			body.line(
				`                                'value' => ${variable},`
			);
			body.line('                        );');
			body.line('                }');
			body.line('        }');
		}
		body.line('}');
	}

	body.line('if ( ! empty( $meta_query ) ) {');
	body.line("        $query_args['meta_query'] = $meta_query;");
	body.line('}');
	body.blank();
}

export function appendMetaSanitizer(
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
		appendMetaSanitizerValue(
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

	appendMetaSanitizerValue(body, variable, descriptor, indent);
}

function appendMetaSanitizerValue(
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
