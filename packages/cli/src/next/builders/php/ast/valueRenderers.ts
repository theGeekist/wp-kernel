import { KernelError } from '@wpkernel/core/contracts';
import {
	createArray,
	createArrayItem,
	createReturn,
	createScalarBool,
	createScalarFloat,
	createScalarInt,
	createScalarString,
	createNull,
	type PhpExpr,
	type PhpStmtReturn,
} from './nodes';
import { createPrintable, type PhpPrintable } from './printables';
import { PHP_INDENT } from './templates';
import { escapeSingleQuotes, isRecord } from './utils';

export function createPhpReturn(
	value: unknown,
	indentLevel: number
): PhpPrintable<PhpStmtReturn> {
	const expression = createPhpExpression(value, indentLevel);
	const indent = PHP_INDENT.repeat(indentLevel);

	const lines = [...expression.lines];
	const firstLine = lines[0] ?? `${indent}return null`;
	const remainder = firstLine.slice(indent.length);
	lines[0] = `${indent}return ${remainder}`;

	const lastIndex = lines.length - 1;
	lines[lastIndex] = `${lines[lastIndex]};`;

	return createPrintable(createReturn(expression.node), lines);
}

export function renderPhpReturn(value: unknown, indentLevel: number): string[] {
	return [...createPhpReturn(value, indentLevel).lines];
}

export function createPhpExpression(
	value: unknown,
	indentLevel: number
): PhpPrintable<PhpExpr> {
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

export function renderPhpExpression(
	value: unknown,
	indentLevel: number
): string[] {
	return [...createPhpExpression(value, indentLevel).lines];
}

function renderPhpList(
	value: unknown[],
	indentLevel: number,
	indent: string
): PhpPrintable<PhpExpr> {
	if (value.length === 0) {
		return createPrintable(createArray([]), [`${indent}[]`]);
	}

	const lines = [`${indent}[`];
	const items: ReturnType<typeof createArrayItem>[] = [];

	for (const entry of value) {
		const rendered = createPhpExpression(entry, indentLevel + 1);
		const childLines = [...rendered.lines];
		const last = childLines.length - 1;
		childLines[last] = `${childLines[last]},`;
		lines.push(...childLines);
		items.push(createArrayItem(rendered.node));
	}

	lines.push(`${indent}]`);
	return createPrintable(createArray(items), lines);
}

function renderPhpAssociative(
	value: Record<string, unknown>,
	indentLevel: number,
	indent: string
): PhpPrintable<PhpExpr> {
	const entries = Object.entries(value);
	if (entries.length === 0) {
		return createPrintable(createArray([]), [`${indent}[]`]);
	}

	const lines = [`${indent}[`];
	const items: ReturnType<typeof createArrayItem>[] = [];
	const childIndent = PHP_INDENT.repeat(indentLevel + 1);

	for (const [key, val] of entries) {
		const rendered = createPhpExpression(val, indentLevel + 1);
		const childLines = [...rendered.lines];
		const firstLine = childLines[0]!;
		const remainder = firstLine.slice(childIndent.length);
		childLines[0] = `${childIndent}'${escapeSingleQuotes(key)}' => ${remainder}`;

		const last = childLines.length - 1;
		childLines[last] = `${childLines[last]},`;
		lines.push(...childLines);

		items.push(
			createArrayItem(rendered.node, {
				key: createScalarString(key),
			})
		);
	}

	lines.push(`${indent}]`);
	return createPrintable(createArray(items), lines);
}

function renderPhpScalar(
	value: unknown,
	indent: string
): PhpPrintable<PhpExpr> {
	if (typeof value === 'string') {
		const node = createScalarString(value);
		return createPrintable(node, [
			`${indent}'${escapeSingleQuotes(value)}'`,
		]);
	}

	if (typeof value === 'number') {
		if (!Number.isFinite(value)) {
			throw new KernelError('DeveloperError', {
				message: 'Cannot render non-finite numbers in PHP output.',
				context: { value },
			});
		}

		const node = Number.isInteger(value)
			? createScalarInt(value)
			: createScalarFloat(value);

		return createPrintable(node, [`${indent}${value}`]);
	}

	if (typeof value === 'bigint') {
		const literal = value.toString();
		const node = createScalarString(literal);
		return createPrintable(node, [`${indent}${literal}`]);
	}

	if (typeof value === 'boolean') {
		const node = createScalarBool(value);
		return createPrintable(node, [`${indent}${value ? 'true' : 'false'}`]);
	}

	if (value === null) {
		return createPrintable(createNull(), [`${indent}null`]);
	}

	throw new KernelError('DeveloperError', {
		message: `Unsupported PHP value: ${String(value)}`,
		context: { value },
	});
}
