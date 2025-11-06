import { WPKernelError } from '@wpkernel/core/contracts';
import type {
	ResourceIdentityConfig,
	ResourceStorageConfig,
} from '@wpkernel/core/resource';
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

/**
 * @category WordPress AST
 */
export type JsonValue =
	| string
	| number
	| boolean
	| null
	| readonly JsonValue[]
	| { readonly [key: string]: JsonValue };

/**
 * @param    value
 * @category WordPress AST
 */
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

/**
 * @param    identity
 * @category WordPress AST
 */
export function normalizeIdentityConfig(
	identity?: ResourceIdentityConfig | null
): JsonValue | null {
	if (!identity) {
		return null;
	}

	const param =
		identity.param ?? (identity.type === 'number' ? 'id' : 'slug');
	const cast = identity.type === 'number' ? 'int' : undefined;
	const guards: readonly string[] =
		identity.type === 'number' ? ['is_numeric'] : ['is_string'];

	const payload: Record<string, JsonValue> = {
		type: identity.type,
		param,
		guards,
	};

	if (cast) {
		payload.cast = cast;
	}

	return sanitizeJsonValue(payload);
}

/**
 * @param    storage
 * @category WordPress AST
 */
export function normalizeStorageConfig(
	storage?: ResourceStorageConfig | null
): JsonValue | null {
	if (!storage) {
		return null;
	}

	switch (storage.mode) {
		case 'transient': {
			return normalizeTransientStorage(storage);
		}
		case 'wp-option': {
			return normalizeOptionStorage(storage);
		}
		case 'wp-taxonomy': {
			return normalizeTaxonomyStorage(storage);
		}
		case 'wp-post': {
			return normalizePostStorage(storage);
		}
		default: {
			return sanitizeJsonValue(storage as unknown as JsonValue);
		}
	}
}

function normalizeTransientStorage(
	storage: Extract<ResourceStorageConfig, { mode: 'transient' }>
): JsonValue {
	return sanitizeJsonValue({ mode: storage.mode });
}

function normalizeOptionStorage(
	storage: Extract<ResourceStorageConfig, { mode: 'wp-option' }>
): JsonValue {
	return sanitizeJsonValue({
		mode: storage.mode,
		option: storage.option,
	});
}

function normalizeTaxonomyStorage(
	storage: Extract<ResourceStorageConfig, { mode: 'wp-taxonomy' }>
): JsonValue {
	const payload: Record<string, JsonValue> = {
		mode: storage.mode,
		taxonomy: storage.taxonomy,
	};

	if (typeof storage.hierarchical === 'boolean') {
		payload.hierarchical = storage.hierarchical;
	}

	return sanitizeJsonValue(payload);
}

function normalizePostStorage(
	storage: Extract<ResourceStorageConfig, { mode: 'wp-post' }>
): JsonValue {
	const payload: Record<string, JsonValue> = {
		mode: storage.mode,
	};

	if (storage.postType) {
		payload.postType = storage.postType;
	}

	if (Array.isArray(storage.statuses) && storage.statuses.length > 0) {
		payload.statuses = sanitizeJsonValue(
			sortValues(storage.statuses)
		) as JsonValue;
	}

	if (Array.isArray(storage.supports) && storage.supports.length > 0) {
		payload.supports = sanitizeJsonValue(
			sortValues(storage.supports)
		) as JsonValue;
	}

	if (storage.meta) {
		payload.meta = sanitizeJsonValue(sortRecord(storage.meta)) as JsonValue;
	}

	if (storage.taxonomies) {
		payload.taxonomies = sanitizeJsonValue(
			sortRecord(storage.taxonomies)
		) as JsonValue;
	}

	return sanitizeJsonValue(payload);
}

function sortValues(values: readonly string[]): readonly string[] {
	return [...values].sort();
}

function sortRecord<T extends Record<string, JsonValue | undefined>>(
	record: T
): {
	readonly [K in keyof T]: JsonValue;
} {
	const entries = Object.entries(record)
		.map(
			([key, value]) =>
				[key, sanitizeJsonValue(value as JsonValue)] as const
		)
		.sort(([left], [right]) => left.localeCompare(right));

	return Object.fromEntries(entries) as {
		readonly [K in keyof T]: JsonValue;
	};
}

/**
 * @param    value
 * @category WordPress AST
 */
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
