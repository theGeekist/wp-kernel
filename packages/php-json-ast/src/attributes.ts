import type { PhpAttributes } from './types';

export const EMPTY_PHP_ATTRIBUTES: PhpAttributes = Object.freeze({});

export function normalisePhpAttributes(
	attributes?: PhpAttributes | null
): PhpAttributes {
	if (!attributes) {
		return EMPTY_PHP_ATTRIBUTES;
	}

	if (attributes === EMPTY_PHP_ATTRIBUTES) {
		return attributes;
	}

	const keys = Object.keys(attributes);
	if (keys.length === 0) {
		return EMPTY_PHP_ATTRIBUTES;
	}

	const clone: Record<string, unknown> = {};
	for (const key of keys) {
		clone[key] = attributes[key as keyof typeof attributes];
	}

	return clone as PhpAttributes;
}

export function mergePhpNodeAttributes<
	T extends { readonly attributes: PhpAttributes },
>(node: T, attributes?: PhpAttributes | null): T {
	if (!attributes || attributes === node.attributes) {
		return node;
	}

	const merged = normalisePhpAttributes({
		...node.attributes,
		...attributes,
	});

	if (merged === node.attributes) {
		return node;
	}

	return {
		...(node as Record<string, unknown>),
		attributes: merged,
	} as T;
}

export function isPhpAttributes(value: unknown): value is PhpAttributes {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return false;
	}

	const prototype = Object.getPrototypeOf(value);
	if (prototype !== null && prototype !== Object.prototype) {
		return false;
	}

	return true;
}
