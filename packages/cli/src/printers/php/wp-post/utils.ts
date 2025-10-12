export function toSnakeCase(value: string): string {
	return value
		.replace(/[^a-zA-Z0-9]+/g, '_')
		.replace(/([a-z0-9])([A-Z])/g, '$1_$2')
		.toLowerCase()
		.replace(/^_+|_+$/g, '')
		.replace(/_+/g, '_');
}

export function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}
