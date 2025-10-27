import { WPKernelError } from '@wpkernel/core/contracts';
import {
	buildArray,
	buildArrayItem,
	buildNull,
	buildScalarBool,
	buildScalarFloat,
	buildScalarInt,
	buildScalarString,
	buildVariable,
	type PhpExpr,
} from '@wpkernel/php-json-ast';
import { normaliseVariableReference } from './utils';

export interface VariableValueDescriptor {
	readonly kind: 'variable';
	readonly name: string;
}

export interface ExpressionValueDescriptor {
	readonly kind: 'expression';
	readonly expr: PhpExpr;
}

export type StructuredPhpValue =
	| string
	| number
	| boolean
	| bigint
	| null
	| readonly unknown[]
	| Record<string, unknown>;

export type PhpValueDescriptor =
	| StructuredPhpValue
	| VariableValueDescriptor
	| ExpressionValueDescriptor;

export function variable(name: string): VariableValueDescriptor {
	return { kind: 'variable', name };
}

export function expression(expr: PhpExpr): ExpressionValueDescriptor {
	return { kind: 'expression', expr };
}

export function renderPhpValue(value: PhpValueDescriptor): PhpExpr {
	if (isVariableDescriptor(value)) {
		return renderVariable(value);
	}

	if (isExpressionDescriptor(value)) {
		return renderExpression(value);
	}

	return renderStructuredValue(value);
}

function isVariableDescriptor(
	value: PhpValueDescriptor
): value is VariableValueDescriptor {
	if (!value || typeof value !== 'object') {
		return false;
	}

	return 'kind' in value && (value as { kind?: unknown }).kind === 'variable';
}

function isExpressionDescriptor(
	value: PhpValueDescriptor
): value is ExpressionValueDescriptor {
	if (!value || typeof value !== 'object') {
		return false;
	}

	return (
		'kind' in value && (value as { kind?: unknown }).kind === 'expression'
	);
}

function renderVariable(descriptor: VariableValueDescriptor): PhpExpr {
	const reference = normaliseVariableReference(descriptor.name);
	return buildVariable(reference.raw);
}

function renderExpression(descriptor: ExpressionValueDescriptor): PhpExpr {
	return descriptor.expr;
}

function renderStructuredValue(value: StructuredPhpValue): PhpExpr {
	if (Array.isArray(value)) {
		const items = value.map((entry) =>
			buildArrayItem(renderStructuredValue(entry as StructuredPhpValue))
		);

		return buildArray(items);
	}

	if (isPlainRecord(value)) {
		const items = Object.entries(value).map(([key, entry]) =>
			buildArrayItem(renderStructuredValue(entry as StructuredPhpValue), {
				key: buildScalarString(key),
			})
		);

		return buildArray(items);
	}

	if (typeof value === 'string') {
		return buildScalarString(value);
	}

	if (typeof value === 'number') {
		if (!Number.isFinite(value)) {
			throw new WPKernelError('DeveloperError', {
				message: 'Cannot render non-finite numbers in PHP output.',
				context: { value },
			});
		}

		return Number.isInteger(value)
			? buildScalarInt(value)
			: buildScalarFloat(value);
	}

	if (typeof value === 'boolean') {
		return buildScalarBool(value);
	}

	if (value === null) {
		return buildNull();
	}

	throw new WPKernelError('DeveloperError', {
		message: `Unsupported PHP value: ${String(value)}`,
		context: { value },
	});
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	if (!value || typeof value !== 'object') {
		return false;
	}

	return !Array.isArray(value);
}
