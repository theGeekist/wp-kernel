import {
	buildPhpExpressionPrintable,
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

	const printable = buildPhpExpressionPrintable(value, 0);
	return printable.node;
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
