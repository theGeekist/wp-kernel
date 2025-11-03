import { toSnakeCase } from '../../query/utils';

export function makeErrorCodeFactory(
	resourceName: string
): (suffix: string) => string {
	const base = toSnakeCase(resourceName) || 'resource';
	return (suffix: string) => `wpk_${base}_${suffix}`;
}
