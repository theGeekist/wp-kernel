export function escapeSingleQuotes(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export function toPascalCase(value: string): string {
	return (
		value
			.split(/[^a-zA-Z0-9]+/u)
			.filter(Boolean)
			.map(
				(segment) => segment.charAt(0).toUpperCase() + segment.slice(1)
			)
			.join('') || ''
	);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function sanitizeJson<T>(value: T): T {
	if (Array.isArray(value)) {
		return value.map((entry) => sanitizeJson(entry)) as unknown as T;
	}

	if (isRecord(value)) {
		const entries = Object.entries(value)
			.map(([key, val]) => [key, sanitizeJson(val)] as const)
			.sort(([a], [b]) => a.localeCompare(b));
		return Object.fromEntries(entries) as T;
	}

	return value;
}
