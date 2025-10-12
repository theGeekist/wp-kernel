import { PHP_INDENT } from './template';
import { escapeSingleQuotes, isRecord } from './utils';

export function renderPhpReturn(value: unknown, indentLevel: number): string[] {
	const expressionLines = renderPhpExpression(value, indentLevel);

	const indent = PHP_INDENT.repeat(indentLevel);
	const firstLine = expressionLines[0]!;
	const remainder = firstLine.slice(indent.length);
	expressionLines[0] = `${indent}return ${remainder}`;

	const lastIndex = expressionLines.length - 1;
	expressionLines[lastIndex] = `${expressionLines[lastIndex]};`;

	return expressionLines;
}

export function renderPhpExpression(
	value: unknown,
	indentLevel: number
): string[] {
	const indent = PHP_INDENT.repeat(indentLevel);

	if (Array.isArray(value)) {
		return renderPhpList(value, indentLevel, indent);
	}

	if (isRecord(value)) {
		return renderPhpAssociative(
			value as Record<string, unknown>,
			indentLevel,
			indent
		);
	}

	return renderPhpScalar(value, indent);
}

function renderPhpList(
	value: unknown[],
	indentLevel: number,
	indent: string
): string[] {
	if (value.length === 0) {
		return [`${indent}[]`];
	}

	const lines = [`${indent}[`];
	for (const entry of value) {
		const rendered = renderPhpExpression(entry, indentLevel + 1);
		const last = rendered.length - 1;
		rendered[last] = `${rendered[last]},`;
		lines.push(...rendered);
	}

	lines.push(`${indent}]`);
	return lines;
}

function renderPhpAssociative(
	value: Record<string, unknown>,
	indentLevel: number,
	indent: string
): string[] {
	const entries = Object.entries(value);
	if (entries.length === 0) {
		return [`${indent}[]`];
	}

	const lines = [`${indent}[`];
	const childIndent = PHP_INDENT.repeat(indentLevel + 1);

	for (const [key, val] of entries) {
		const rendered = renderPhpExpression(val, indentLevel + 1);
		if (rendered.length === 0) {
			continue;
		}

		const firstLine = rendered[0]!;
		const remainder = firstLine.slice(childIndent.length);
		rendered[0] = `${childIndent}'${escapeSingleQuotes(key)}' => ${remainder}`;

		const last = rendered.length - 1;
		rendered[last] = `${rendered[last]},`;
		lines.push(...rendered);
	}

	lines.push(`${indent}]`);
	return lines;
}

function renderPhpScalar(value: unknown, indent: string): string[] {
	if (typeof value === 'string') {
		return [`${indent}'${escapeSingleQuotes(value)}'`];
	}

	if (typeof value === 'number') {
		if (!Number.isFinite(value)) {
			throw new Error('Cannot render non-finite numbers in PHP output.');
		}

		return [`${indent}${value}`];
	}

	if (typeof value === 'bigint') {
		return [`${indent}${value.toString()}`];
	}

	if (typeof value === 'boolean') {
		return [`${indent}${value ? 'true' : 'false'}`];
	}

	if (value === null) {
		return [`${indent}null`];
	}

	throw new Error(`Unsupported PHP value: ${String(value)}`);
}
