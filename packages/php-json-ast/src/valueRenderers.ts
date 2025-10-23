import { KernelError } from './KernelError';
import {
	buildArray,
	buildArrayItem,
	buildReturn,
	buildScalarBool,
	buildScalarFloat,
	buildScalarInt,
	buildScalarString,
	buildNull,
	type PhpExpr,
	type PhpStmtReturn,
} from './nodes';
import { buildPrintable, type PhpPrintable } from './printables';
import { PHP_INDENT } from './templates';
import { escapeSingleQuotes, isRecord } from './utils';

export function buildPhpReturnPrintable(
	value: unknown,
	indentLevel: number
): PhpPrintable<PhpStmtReturn> {
	const expression = buildPhpExpressionPrintable(value, indentLevel);
	const indent = PHP_INDENT.repeat(indentLevel);

	const lines = [...expression.lines];
	const firstLine = lines[0] ?? `${indent}return null`;
	const remainder = firstLine.slice(indent.length);
	lines[0] = `${indent}return ${remainder}`;

	const lastIndex = lines.length - 1;
	lines[lastIndex] = `${lines[lastIndex]};`;

	return buildPrintable(buildReturn(expression.node), lines);
}

export function renderPhpReturn(value: unknown, indentLevel: number): string[] {
	return [...buildPhpReturnPrintable(value, indentLevel).lines];
}

export function buildPhpExpressionPrintable(
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
	return [...buildPhpExpressionPrintable(value, indentLevel).lines];
}

function renderPhpList(
	value: unknown[],
	indentLevel: number,
	indent: string
): PhpPrintable<PhpExpr> {
	if (value.length === 0) {
		return buildPrintable(buildArray([]), [`${indent}[]`]);
	}

	const lines = [`${indent}[`];
	const items: ReturnType<typeof buildArrayItem>[] = [];

	for (const entry of value) {
		const rendered = buildPhpExpressionPrintable(entry, indentLevel + 1);
		const childLines = [...rendered.lines];
		const last = childLines.length - 1;
		childLines[last] = `${childLines[last]},`;
		lines.push(...childLines);
		items.push(buildArrayItem(rendered.node));
	}

	lines.push(`${indent}]`);
	return buildPrintable(buildArray(items), lines);
}

function renderPhpAssociative(
	value: Record<string, unknown>,
	indentLevel: number,
	indent: string
): PhpPrintable<PhpExpr> {
	const entries = Object.entries(value);
	if (entries.length === 0) {
		return buildPrintable(buildArray([]), [`${indent}[]`]);
	}

	const lines = [`${indent}[`];
	const items: ReturnType<typeof buildArrayItem>[] = [];
	const childIndent = PHP_INDENT.repeat(indentLevel + 1);

	for (const [key, val] of entries) {
		const rendered = buildPhpExpressionPrintable(val, indentLevel + 1);
		const childLines = [...rendered.lines];
		const firstLine = childLines[0]!;
		const remainder = firstLine.slice(childIndent.length);
		childLines[0] = `${childIndent}'${escapeSingleQuotes(key)}' => ${remainder}`;

		const last = childLines.length - 1;
		childLines[last] = `${childLines[last]},`;
		lines.push(...childLines);

		items.push(
			buildArrayItem(rendered.node, {
				key: buildScalarString(key),
			})
		);
	}

	lines.push(`${indent}]`);
	return buildPrintable(buildArray(items), lines);
}

function renderPhpScalar(
	value: unknown,
	indent: string
): PhpPrintable<PhpExpr> {
	if (typeof value === 'string') {
		const node = buildScalarString(value);
		return buildPrintable(node, [
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
			? buildScalarInt(value)
			: buildScalarFloat(value);

		return buildPrintable(node, [`${indent}${value}`]);
	}

	if (typeof value === 'bigint') {
		const literal = value.toString();
		const node = buildScalarString(literal);
		return buildPrintable(node, [
			`${indent}'${escapeSingleQuotes(literal)}'`,
		]);
	}

	if (typeof value === 'boolean') {
		const node = buildScalarBool(value);
		return buildPrintable(node, [`${indent}${value ? 'true' : 'false'}`]);
	}

	if (value === null) {
		return buildPrintable(buildNull(), [`${indent}null`]);
	}

	throw new KernelError('DeveloperError', {
		message: `Unsupported PHP value: ${String(value)}`,
		context: { value },
	});
}
