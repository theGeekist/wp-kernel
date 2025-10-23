import type { IRResource, IRRoute } from '../../ir';
import type { PrinterContext } from '../types';
import type { PhpFileBuilder } from './builder';
import { assembleMethodTemplate, PHP_INDENT } from './template';
import {
	makeErrorCodeFactory,
	escapeSingleQuotes,
	toPascalCase,
} from './utils';

type WpOptionStorage = Extract<
	NonNullable<IRResource['storage']>,
	{ mode: 'wp-option' }
>;

interface RouteDefinition {
	route: IRRoute;
	methodName: string;
}

interface WpOptionContext {
	builder: PhpFileBuilder;
	resource: IRResource;
	storage: WpOptionStorage;
	pascalName: string;
	optionName: string;
	errorCode: (suffix: string) => string;
	titleCaseName: () => string;
}

export function createWpOptionHandlers(options: {
	builder: PhpFileBuilder;
	context: PrinterContext;
	resource: IRResource;
	routes: RouteDefinition[];
}): string[][] {
	if (options.resource.storage?.mode !== 'wp-option') {
		return [];
	}

	const context = createContext(options);
	return buildMethods(context, options.routes);
}

function createContext(options: {
	builder: PhpFileBuilder;
	resource: IRResource;
}): WpOptionContext {
	const storage = options.resource.storage as WpOptionStorage;
	const pascalName = toPascalCase(options.resource.name);
	const errorCode = makeErrorCodeFactory(options.resource.name);

	options.builder.addUse('WP_Error');
	options.builder.addUse('WP_REST_Request');

	return {
		builder: options.builder,
		resource: options.resource,
		storage,
		pascalName,
		optionName: storage.option,
		errorCode,
		titleCaseName: () => pascalName,
	};
}

type OptionRouteKind = 'get' | 'update' | 'unsupported';

function buildMethods(
	context: WpOptionContext,
	routes: RouteDefinition[]
): string[][] {
	const methods: string[][] = [];

	for (const definition of routes) {
		const kind = determineRouteKind(definition.route);
		switch (kind) {
			case 'get':
				methods.push(createGetMethod(context, definition));
				break;
			case 'update':
				methods.push(createUpdateMethod(context, definition));
				break;
			default:
				methods.push(createUnsupportedMethod(context, definition));
				break;
		}
	}

	methods.push(...createHelperMethods(context));
	return methods;
}

function determineRouteKind(route: IRRoute): OptionRouteKind {
	switch (route.method) {
		case 'GET':
			return 'get';
		case 'POST':
		case 'PUT':
		case 'PATCH':
			return 'update';
		default:
			return 'unsupported';
	}
}

function createGetMethod(
	context: WpOptionContext,
	definition: RouteDefinition
): string[] {
	return assembleMethodTemplate({
		signature: `public function ${definition.methodName}( WP_REST_Request $request )`,
		indentLevel: 1,
		indentUnit: PHP_INDENT,
		docblock: [
			`Handle [${definition.route.method}] ${definition.route.path}.`,
		],
		body: (body) => {
			body.line(
				`$option_name = $this->get${context.pascalName}OptionName();`
			);
			body.line('$value = get_option( $option_name );');
			body.blank();
			body.line('return array(');
			body.line("        'option' => $option_name,");
			body.line("        'value' => $value,");
			body.line(');');
		},
	});
}

function createUpdateMethod(
	context: WpOptionContext,
	definition: RouteDefinition
): string[] {
	return assembleMethodTemplate({
		signature: `public function ${definition.methodName}( WP_REST_Request $request )`,
		indentLevel: 1,
		indentUnit: PHP_INDENT,
		docblock: [
			`Handle [${definition.route.method}] ${definition.route.path}.`,
		],
		body: (body) => {
			body.line(
				`$option_name = $this->get${context.pascalName}OptionName();`
			);
			body.line('$previous = get_option( $option_name );');
			body.line("$value = $request->get_param( 'value' );");
			body.line(
				`$autoload = $this->normalise${context.pascalName}Autoload( $request->get_param( 'autoload' ) );`
			);
			body.blank();
			body.line('if ( null !== $autoload ) {');
			body.line(
				'$updated = update_option( $option_name, $value, $autoload );'
			);
			body.line('} else {');
			body.line('$updated = update_option( $option_name, $value );');
			body.line('}');
			body.blank();
			body.line('$value_after = get_option( $option_name );');
			body.blank();
			body.line('return array(');
			body.line("        'option' => $option_name,");
			body.line("        'updated' => (bool) $updated,");
			body.line("        'value' => $value_after,");
			body.line("        'previous' => $previous,");
			body.line(');');
		},
	});
}

function createUnsupportedMethod(
	context: WpOptionContext,
	definition: RouteDefinition
): string[] {
	return assembleMethodTemplate({
		signature: `public function ${definition.methodName}( WP_REST_Request $request )`,
		indentLevel: 1,
		indentUnit: PHP_INDENT,
		docblock: [
			`Handle [${definition.route.method}] ${definition.route.path}.`,
		],
		body: (body) => {
			body.line(
				`return new WP_Error( '${context.errorCode('unsupported_operation')}', '${escapeSingleQuotes(`Operation not supported for ${context.titleCaseName()} option.`)}', array( 'status' => 501 ) );`
			);
		},
	});
}

function createHelperMethods(context: WpOptionContext): string[][] {
	const helpers: string[][] = [];

	helpers.push(
		assembleMethodTemplate({
			signature: `private function get${context.pascalName}OptionName(): string`,
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				body.line(
					`return '${escapeSingleQuotes(context.optionName)}';`
				);
			},
		})
	);

	helpers.push(
		assembleMethodTemplate({
			signature: `private function normalise${context.pascalName}Autoload( $value ): ?string`,
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				body.line('if ( null === $value ) {');
				body.line('        return null;');
				body.line('}');
				body.line('if ( is_bool( $value ) ) {');
				body.line("        return $value ? 'yes' : 'no';");
				body.line('}');
				body.line('if ( is_numeric( $value ) ) {');
				body.line(
					"        return ( (int) $value ) === 1 ? 'yes' : 'no';"
				);
				body.line('}');
				body.line('if ( ! is_string( $value ) ) {');
				body.line('        return null;');
				body.line('}');
				body.line(
					'$normalised = strtolower( trim( (string) $value ) );'
				);
				body.line(
					"if ( in_array( $normalised, array( '1', 'true', 'yes' ), true ) ) {"
				);
				body.line("        return 'yes';");
				body.line('}');
				body.line(
					"if ( in_array( $normalised, array( '0', 'false', 'no' ), true ) ) {"
				);
				body.line("        return 'no';");
				body.line('}');
				body.line('return null;');
			},
		})
	);

	return helpers;
}
