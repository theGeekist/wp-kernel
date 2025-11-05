import crypto from 'node:crypto';

/**
 * Create a stable SHA-256 hash for the canonical representation of a value.
 *
 * The value is canonicalised (stable key ordering, normalized newlines) and
 * then hashed so callers can compare content identity deterministically.
 *
 * @param    value - Value to canonicalise and hash
 * @returns Hex-encoded sha256 digest of the canonical JSON
 * @category IR
 */
export function hashCanonical(value: unknown): string {
	const serialised = canonicalJson(value);
	return crypto.createHash('sha256').update(serialised, 'utf8').digest('hex');
}

/**
 * Produce a deterministic JSON string for a value.
 *
 * Objects are sorted by key and arrays are preserved. Newlines are
 * normalised to LF to ensure stable output across platforms.
 *
 * @param    value - Value to serialise
 * @returns Stable JSON string
 * @category IR
 */
export function canonicalJson(value: unknown): string {
	return JSON.stringify(sortValue(value), null, 2).replace(/\r\n/g, '\n');
}

/**
 * Recursively sort object keys and normalize undefined to null.
 *
 * This helper is used by `canonicalJson` to ensure objects have a
 * deterministic property ordering prior to serialisation.
 *
 * @typeParam T - Value type
 * @param     value - Value to sort
 * @returns Value with objects' keys sorted
 * @category IR
 */
export function sortValue<T>(value: T): T {
	if (Array.isArray(value)) {
		return value.map((entry) => sortValue(entry)) as unknown as T;
	}

	if (value && typeof value === 'object') {
		const entries = Object.entries(value as Record<string, unknown>)
			.map(([key, val]) => [key, sortValue(val)] as const)
			.sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

		return Object.fromEntries(entries) as T;
	}

	if (typeof value === 'undefined') {
		return null as unknown as T;
	}

	return value;
}

/**
 * Sort the keys of a plain object recursively.
 *
 * A typed convenience wrapper around `sortValue` for record-like values.
 *
 * @typeParam T - Object type
 * @param     value - Object whose keys should be sorted
 * @returns New object with sorted keys
 * @category IR
 */
export function sortObject<T extends Record<string, unknown>>(value: T): T {
	return sortValue(value) as T;
}
