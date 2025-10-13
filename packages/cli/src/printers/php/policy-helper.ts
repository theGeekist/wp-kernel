import type { PrinterContext } from '../types';
import { PhpFileBuilder } from './builder';
import { appendGeneratedFileDocblock } from './docblock';
import { sanitizeJson } from './utils';
import { renderPhpExpression } from './value-renderer';
import { createMethodTemplate, PHP_INDENT } from './template';
import type { IRPolicyDefinition } from '../../ir';

export function createPolicyHelperBuilder(
	namespaceRoot: string,
	context: PrinterContext
): PhpFileBuilder {
	const builder = new PhpFileBuilder(`${namespaceRoot}\\Policy`, {
		kind: 'policy-helper',
	});

	const source = context.ir.policyMap.sourcePath ?? '[fallback]';

	appendGeneratedFileDocblock(builder, [
		`Source: ${context.ir.meta.origin} → policy-map (${source})`,
	]);

	builder.addUse('WP_Error');
	builder.addUse('WP_REST_Request');

	builder.appendStatement('final class Policy');
	builder.appendStatement('{');

	const mapStatement = createConstStatement(
		'POLICY_MAP',
		buildPolicyMap(context)
	);
	const fallbackStatement = createConstStatement(
		'FALLBACK',
		sanitizeJson(context.ir.policyMap.fallback)
	);

	builder.appendStatement(mapStatement);
	builder.appendStatement('');
	builder.appendStatement(fallbackStatement);
	builder.appendStatement('');

	const methods = [
		createCallbackMethod(),
		createEnforceMethod(),
		createDefinitionMethod(),
		createBindingMethod(),
		createErrorMethod(),
	];

	for (const method of methods) {
		builder.appendStatement(method.join('\n'));
		builder.appendStatement('');
	}

	builder.appendStatement('}');

	return builder;
}

function createConstStatement(name: string, value: unknown): string {
	const lines = renderPhpExpression(value, 1);
	const indent = PHP_INDENT;
	if (lines.length === 0) {
		return `${indent}private const ${name} = [];`;
	}

	const firstLine = lines[0]!;
	const remainder = firstLine.slice(indent.length);
	lines[0] = `${indent}private const ${name} = ${remainder}`;
	const lastIndex = lines.length - 1;
	lines[lastIndex] = `${lines[lastIndex]};`;
	return lines.join('\n');
}

function buildPolicyMap(context: PrinterContext): Record<string, unknown> {
	const entries: Record<string, unknown> = {};
	for (const definition of context.ir.policyMap.definitions) {
		entries[definition.key] = createPolicyEntry(definition);
	}

	return sanitizeJson(entries);
}

function createPolicyEntry(
	definition: IRPolicyDefinition
): Record<string, unknown> {
	const entry: Record<string, unknown> = {
		capability: definition.capability,
		appliesTo: definition.appliesTo,
	};

	if (definition.binding) {
		entry.binding = definition.binding;
	}

	return sanitizeJson(entry);
}

function createCallbackMethod(): string[] {
	return createMethodTemplate({
		signature:
			'public static function callback( string $policy_key ): callable',
		indentLevel: 1,
		indentUnit: PHP_INDENT,
		docblock: ['Create a permission callback closure for a policy.'],
		body: (body) => {
			body.line(
				'return static function ( WP_REST_Request $request ) use ( $policy_key ) {'
			);
			body.line('        return self::enforce( $policy_key, $request );');
			body.line('};');
		},
	});
}

function createEnforceMethod(): string[] {
	return createMethodTemplate({
		signature:
			'public static function enforce( string $policy_key, WP_REST_Request $request )',
		indentLevel: 1,
		indentUnit: PHP_INDENT,
		docblock: [
			'Evaluate a policy against the current user.',
			'@return bool|WP_Error',
		],
		body: (body) => {
			body.line('$definition = self::get_definition( $policy_key );');
			body.line(
				"$capability = $definition['capability'] ?? self::FALLBACK['capability'];"
			);
			body.line(
				"$scope = $definition['appliesTo'] ?? self::FALLBACK['appliesTo'];"
			);
			body.blank();
			body.line("if ( 'object' === $scope ) {");
			body.line(
				"        $binding = self::get_binding( $definition ) ?? 'id';"
			);
			body.line('        $object_id = $request->get_param( $binding );');
			body.line('        if ( null === $object_id ) {');
			body.line(
				'                return self::create_error( \'wpk_policy_object_missing\', sprintf( \'Object identifier parameter "%s" missing for policy "%s".\', $binding, $policy_key ) );'
			);
			body.line('        }');
			body.blank();
			body.line(
				'        $allowed = current_user_can( $capability, $object_id );'
			);
			body.line('} else {');
			body.line('        $allowed = current_user_can( $capability );');
			body.line('}');
			body.blank();
			body.line('if ( $allowed ) {');
			body.line('        return true;');
			body.line('}');
			body.blank();
			body.line(
				"return self::create_error( 'wpk_policy_denied', 'You are not allowed to perform this action.', array( 'policy' => $policy_key, 'capability' => $capability ) );"
			);
		},
	});
}

function createDefinitionMethod(): string[] {
	return createMethodTemplate({
		signature:
			'private static function get_definition( string $policy_key ): array',
		indentLevel: 1,
		indentUnit: PHP_INDENT,
		docblock: ['Retrieve the configuration for a policy key.'],
		body: (body) => {
			body.line('if ( isset( self::POLICY_MAP[ $policy_key ] ) ) {');
			body.line('        return self::POLICY_MAP[ $policy_key ];');
			body.line('}');
			body.blank();
			body.line('return self::FALLBACK;');
		},
	});
}

function createBindingMethod(): string[] {
	return createMethodTemplate({
		signature:
			'private static function get_binding( array $definition ): ?string',
		indentLevel: 1,
		indentUnit: PHP_INDENT,
		docblock: ['Resolve the request parameter used for object policies.'],
		body: (body) => {
			body.line("$binding = $definition['binding'] ?? null;");
			body.line("if ( is_string( $binding ) && $binding !== '' ) {");
			body.line('        return $binding;');
			body.line('}');
			body.blank();
			body.line('return null;');
		},
	});
}

function createErrorMethod(): string[] {
	return createMethodTemplate({
		signature:
			'private static function create_error( string $code, string $message, array $context = array() ): WP_Error',
		indentLevel: 1,
		indentUnit: PHP_INDENT,
		docblock: [
			'Create a consistent WP_Error instance for policy failures.',
		],
		body: (body) => {
			body.line('$payload = array_merge(');
			body.line("        array( 'status' => 403 ),");
			body.line('        $context');
			body.line(');');
			body.blank();
			body.line('return new WP_Error( $code, $message, $payload );');
		},
	});
}
