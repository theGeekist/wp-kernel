import crypto from 'node:crypto';

export function hashCanonical(value: unknown): string {
	const serialised = canonicalJson(value);
	return crypto.createHash('sha256').update(serialised, 'utf8').digest('hex');
}

export function canonicalJson(value: unknown): string {
	return JSON.stringify(sortValue(value), null, 2).replace(/\r\n/g, '\n');
}

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

export function sortObject<T extends Record<string, unknown>>(value: T): T {
	return sortValue(value) as T;
}
