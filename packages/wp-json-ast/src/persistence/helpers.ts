import { WPKernelError } from '@wpkernel/core/contracts';
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

export type JsonValue =
	| string
	| number
	| boolean
	| null
	| readonly JsonValue[]
	| { readonly [key: string]: JsonValue };

export function sanitizeJsonValue<T extends JsonValue | undefined>(
	value: T
): T {
	if (Array.isArray(value)) {
		const sanitised = value.map((entry) => sanitizeJsonValue(entry));
		return sanitised as unknown as T;
	}

	if (isPlainObject(value)) {
		const entries = Object.entries(value)
			.map(([key, entry]) => [key, sanitizeJsonValue(entry)] as const)
			.sort(([left], [right]) => left.localeCompare(right));

		return Object.fromEntries(entries) as unknown as T;
	}

	return value;
}

export function buildPhpLiteral(value: JsonValue): PhpExpr {
	if (Array.isArray(value)) {
		return buildArray(
			value.map((entry) => buildArrayItem(buildPhpLiteral(entry)))
		);
	}

	if (isPlainObject(value)) {
		return buildArray(
			Object.entries(value).map(([key, entry]) =>
				buildArrayItem(buildPhpLiteral(entry), {
					key: buildScalarString(key),
				})
			)
		);
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
		message: `Unsupported PHP literal: ${String(value)}`,
		context: { value },
	});
}

function isPlainObject(
	value: unknown
): value is { readonly [key: string]: JsonValue } {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
