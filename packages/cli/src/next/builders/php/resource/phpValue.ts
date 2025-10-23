import {
	buildVariable,
	type PhpExpr,
	buildPrintable,
	type PhpPrintable,
} from '@wpkernel/php-json-ast';
import {
	PHP_INDENT,
	buildPhpExpressionPrintable,
} from '@wpkernel/php-json-ast';
import { normaliseVariableReference } from './utils';
import { formatExpression } from './printer';

type PhpPrintableExpr = PhpPrintable<PhpExpr>;

export interface VariableValueDescriptor {
	readonly kind: 'variable';
	readonly name: string;
}

export interface ExpressionValueDescriptor {
	readonly kind: 'expression';
	readonly printable: PhpPrintableExpr;
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

export function expression(
	printable: PhpPrintableExpr
): ExpressionValueDescriptor {
	return { kind: 'expression', printable };
}

export function renderPhpValue(
	value: PhpValueDescriptor,
	indentLevel: number,
	indentUnit: string = PHP_INDENT
): PhpPrintableExpr {
	if (isVariableDescriptor(value)) {
		return renderVariable(value, indentLevel, indentUnit);
	}

	if (isExpressionDescriptor(value)) {
		return renderExpression(value, indentLevel, indentUnit);
	}

	const printable = buildPhpExpressionPrintable(value, 0);
	const lines = formatExpression(printable.node, indentLevel, indentUnit);
	return buildPrintable(printable.node, lines);
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

function renderVariable(
	descriptor: VariableValueDescriptor,
	indentLevel: number,
	indentUnit: string
): PhpPrintableExpr {
	const reference = normaliseVariableReference(descriptor.name);
	const variableExpression = buildVariable(reference.raw);
	const lines = formatExpression(variableExpression, indentLevel, indentUnit);
	return buildPrintable(variableExpression, lines);
}

function renderExpression(
	descriptor: ExpressionValueDescriptor,
	indentLevel: number,
	indentUnit: string
): PhpPrintableExpr {
	const lines = formatExpression(
		descriptor.printable.node,
		indentLevel,
		indentUnit
	);
	return buildPrintable(descriptor.printable.node, lines);
}
