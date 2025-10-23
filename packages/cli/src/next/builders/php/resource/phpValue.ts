import {
	createVariable,
	type PhpExpr,
	createPrintable,
	type PhpPrintable,
} from '@wpkernel/php-json-ast';
import { PHP_INDENT, createPhpExpression } from '@wpkernel/php-json-ast';
import { indentLines, normaliseVariableReference } from './utils';

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

	return createPhpExpression(value, indentLevel);
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
	const indent = indentUnit.repeat(indentLevel);
	return createPrintable(createVariable(reference.raw), [
		`${indent}${reference.display}`,
	]);
}

function renderExpression(
	descriptor: ExpressionValueDescriptor,
	indentLevel: number,
	indentUnit: string
): PhpPrintableExpr {
	const indent = indentUnit.repeat(indentLevel);
	const lines = indentLines(descriptor.printable.lines, indent);
	return createPrintable(descriptor.printable.node, lines);
}
