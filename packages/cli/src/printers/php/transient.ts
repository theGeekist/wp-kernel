import type { IRResource, IRRoute } from '../../ir';
import type { PrinterContext } from '../types';
import type { PhpFileBuilder } from './builder';
import { createMethodTemplate, PHP_INDENT } from './template';
import {
	createErrorCodeFactory,
	escapeSingleQuotes,
	toPascalCase,
	toSnakeCase,
} from './utils';

type TransientRouteKind = 'get' | 'set' | 'unsupported';

type RouteDefinition = {
	route: IRRoute;
	methodName: string;
};

interface TransientContext {
	builder: PhpFileBuilder;
	resource: IRResource;
	pascalName: string;
	transientKey: string;
	errorCode: (suffix: string) => string;
	titleCaseName: () => string;
}

export function createTransientHandlers(options: {
	builder: PhpFileBuilder;
	context: PrinterContext;
	resource: IRResource;
	routes: RouteDefinition[];
}): string[][] {
	if (options.resource.storage?.mode !== 'transient') {
		return [];
	}

	const transientContext = createContext(options);
	return buildMethods(transientContext, options.routes);
}

function createContext(options: {
	builder: PhpFileBuilder;
	context: PrinterContext;
	resource: IRResource;
}): TransientContext {
	const pascalName = toPascalCase(options.resource.name);
	const errorCode = createErrorCodeFactory(options.resource.name);

	options.builder.addUse('WP_Error');
	options.builder.addUse('WP_REST_Request');

	const namespace =
		options.context.ir.meta.sanitizedNamespace ??
		options.context.ir.meta.namespace ??
		'';
	const namespaceSlug = toSnakeCase(namespace.replace(/\\/g, '_'));
	const resourceSlug = toSnakeCase(options.resource.name) || 'resource';
	const keyParts = [namespaceSlug, resourceSlug].filter(Boolean);
	const transientKey =
		keyParts.length > 0 ? keyParts.join('_') : resourceSlug;

	return {
		builder: options.builder,
		resource: options.resource,
		pascalName,
		transientKey,
		errorCode,
		titleCaseName: () => pascalName,
	};
}

function buildMethods(
	context: TransientContext,
	routes: RouteDefinition[]
): string[][] {
	const methods: string[][] = [];

	for (const definition of routes) {
		const kind = determineRouteKind(definition.route);
		switch (kind) {
			case 'get':
				methods.push(createGetMethod(context, definition));
				break;
			case 'set':
				methods.push(createSetMethod(context, definition));
				break;
			default:
				methods.push(createUnsupportedMethod(context, definition));
				break;
		}
	}

	methods.push(...createHelperMethods(context));
	return methods;
}

function determineRouteKind(route: IRRoute): TransientRouteKind {
	switch (route.method) {
		case 'GET':
			return 'get';
		case 'POST':
		case 'PUT':
		case 'PATCH':
			return 'set';
		default:
			return 'unsupported';
	}
}

function createGetMethod(
	context: TransientContext,
	definition: RouteDefinition
): string[] {
	return createMethodTemplate({
		signature: `public function ${definition.methodName}( WP_REST_Request $request )`,
		indentLevel: 1,
		indentUnit: PHP_INDENT,
		docblock: [
			`Handle [${definition.route.method}] ${definition.route.path}.`,
		],
		body: (body) => {
			body.line(`$key = $this->get${context.pascalName}TransientKey();`);
			body.line('$value = get_transient( $key );');
			body.blank();
			body.line('return array(');
			body.line("        'key' => $key,");
			body.line("        'value' => $value,");
			body.line(');');
		},
	});
}

function createSetMethod(
	context: TransientContext,
	definition: RouteDefinition
): string[] {
	return createMethodTemplate({
		signature: `public function ${definition.methodName}( WP_REST_Request $request )`,
		indentLevel: 1,
		indentUnit: PHP_INDENT,
		docblock: [
			`Handle [${definition.route.method}] ${definition.route.path}.`,
		],
		body: (body) => {
			body.line(`$key = $this->get${context.pascalName}TransientKey();`);
			body.line('$previous = get_transient( $key );');
			body.line("$value = $request->get_param( 'value' );");
			body.line(
				`$expiration = $this->normalise${context.pascalName}Expiration( $request->get_param( 'expiration' ) );`
			);
			body.blank();
			body.line('$stored = set_transient( $key, $value, $expiration );');
			body.line('$current = get_transient( $key );');
			body.blank();
			body.line('return array(');
			body.line("        'key' => $key,");
			body.line("        'stored' => (bool) $stored,");
			body.line("        'value' => $current,");
			body.line("        'previous' => $previous,");
			body.line("        'expiration' => $expiration,");
			body.line(');');
		},
	});
}

function createUnsupportedMethod(
	context: TransientContext,
	definition: RouteDefinition
): string[] {
	return createMethodTemplate({
		signature: `public function ${definition.methodName}( WP_REST_Request $request )`,
		indentLevel: 1,
		indentUnit: PHP_INDENT,
		docblock: [
			`Handle [${definition.route.method}] ${definition.route.path}.`,
		],
		body: (body) => {
			body.line(
				`return new WP_Error( '${context.errorCode('unsupported_operation')}', '${escapeSingleQuotes(`Operation not supported for ${context.titleCaseName()} transient.`)}', array( 'status' => 501 ) );`
			);
		},
	});
}

function createHelperMethods(context: TransientContext): string[][] {
	const helpers: string[][] = [];

	helpers.push(
		createMethodTemplate({
			signature: `private function get${context.pascalName}TransientKey(): string`,
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				body.line(
					`return '${escapeSingleQuotes(context.transientKey)}';`
				);
			},
		})
	);

	helpers.push(
		createMethodTemplate({
			signature: `private function normalise${context.pascalName}Expiration( $value ): int`,
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				body.line('if ( null === $value ) {');
				body.line('        return 0;');
				body.line('}');
				body.line('if ( is_int( $value ) ) {');
				body.line('        return max( 0, $value );');
				body.line('}');
				body.line('if ( is_numeric( $value ) ) {');
				body.line('        return max( 0, (int) $value );');
				body.line('}');
				body.line('if ( ! is_string( $value ) ) {');
				body.line('        return 0;');
				body.line('}');
				body.line('$sanitised = trim( (string) $value );');
				body.line("if ( '' === $sanitised ) {");
				body.line('        return 0;');
				body.line('}');
				body.line('if ( is_numeric( $sanitised ) ) {');
				body.line('        return max( 0, (int) $sanitised );');
				body.line('}');
				body.line('return 0;');
			},
		})
	);

	return helpers;
}
