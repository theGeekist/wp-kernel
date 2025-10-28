import {
	buildArray,
	buildArrayItem,
	buildNull,
	buildScalarBool,
	buildScalarFloat,
	buildScalarInt,
	buildScalarString,
	type PhpExpr,
} from '@wpkernel/php-json-ast';

import type { PolicyDefinition, PolicyFallback } from './types';

export function createPolicyMapExpr(
	definitions: readonly PolicyDefinition[]
): PhpExpr {
	const record: Record<string, unknown> = {};

	for (const definition of definitions) {
		record[definition.key] = sanitizeValue({
			capability: definition.capability,
			appliesTo: definition.appliesTo,
			binding: definition.binding ?? null,
		});
	}

	return renderStructuredValue(record);
}

export function createFallbackExpr(fallback: PolicyFallback): PhpExpr {
	return renderStructuredValue(sanitizeValue(fallback));
}

function sanitizeValue<T>(value: T): T {
	if (Array.isArray(value)) {
		return value.map((entry) => sanitizeValue(entry)) as unknown as T;
	}

	if (value && typeof value === 'object') {
		const entries = Object.entries(value as Record<string, unknown>)
			.map(([key, entry]) => [key, sanitizeValue(entry)] as const)
			.sort(([left], [right]) => left.localeCompare(right));

		return Object.fromEntries(entries) as T;
	}

	return value;
}

function renderStructuredValue(value: unknown): PhpExpr {
	if (Array.isArray(value)) {
		return renderArrayValue(value);
	}

	if (isPlainObject(value)) {
		return renderObjectValue(value as Record<string, unknown>);
	}

	return renderScalarValue(value);
}

function renderArrayValue(entries: readonly unknown[]): PhpExpr {
	const items = entries.map((entry) =>
		buildArrayItem(renderStructuredValue(entry))
	);
	return buildArray(items);
}

function renderObjectValue(record: Record<string, unknown>): PhpExpr {
	const items = Object.entries(record).map(([key, entry]) =>
		buildArrayItem(renderStructuredValue(entry), {
			key: buildScalarString(key),
		})
	);
	return buildArray(items);
}

function renderScalarValue(value: unknown): PhpExpr {
	if (typeof value === 'string') {
		return buildScalarString(value);
	}

	if (typeof value === 'number') {
		if (!Number.isFinite(value)) {
			throw new TypeError(
				'Cannot render non-finite numbers in policy module.'
			);
		}

		return Number.isInteger(value)
			? buildScalarInt(value)
			: buildScalarFloat(value);
	}

	if (typeof value === 'boolean') {
		return buildScalarBool(value);
	}

	if (typeof value === 'bigint') {
		return buildScalarInt(Number(value));
	}

	if (value === null) {
		return buildNull();
	}

	throw new TypeError(
		`Unsupported policy map value: ${String(value ?? 'undefined')}`
	);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
