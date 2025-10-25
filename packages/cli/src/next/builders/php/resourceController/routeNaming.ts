import { toPascalCase } from '../utils';
import type { IRRoute, IRv1 } from '../../../../ir/types';

export function buildRouteMethodName(route: IRRoute, ir: IRv1): string {
	const method = route.method.toLowerCase();
	const segments = deriveRouteSegments(route.path, ir);
	const suffix = segments.map(toPascalCase).join('') || 'Route';
	return `${method}${suffix}`;
}

export function deriveRouteSegments(path: string, ir: IRv1): string[] {
	const trimmed = path.replace(/^\/+/, '');
	if (!trimmed) {
		return [];
	}

	const segments = trimmed
		.split('/')
		.filter((segment: string): segment is string => segment.length > 0)
		.map((segment: string) => segment.replace(/^:/, ''));

	const namespaceVariants = new Set<string>(
		[
			ir.meta.namespace,
			ir.meta.namespace.replace(/\\/g, '/'),
			ir.meta.sanitizedNamespace,
			ir.meta.sanitizedNamespace.replace(/\\/g, '/'),
		]
			.map((value) =>
				value
					.split('/')
					.filter(
						(segment: string): segment is string =>
							segment.length > 0
					)
					.map((segment: string) => segment.toLowerCase())
			)
			.map((variant: string[]) => variant.join('/'))
	);

	const normalisedSegments = segments.map((segment: string) =>
		segment.toLowerCase()
	);

	for (const variant of namespaceVariants) {
		const variantSegments = variant.split('/');
		let matches = true;
		for (let index = 0; index < variantSegments.length; index += 1) {
			if (normalisedSegments[index] !== variantSegments[index]) {
				matches = false;
				break;
			}
		}

		if (matches) {
			return segments.slice(variantSegments.length);
		}
	}

	return segments;
}
