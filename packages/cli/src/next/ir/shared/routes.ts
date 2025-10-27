import { KernelError } from '@wpkernel/core/error';
import type { ResourceConfig, ResourceRoute } from '@wpkernel/core/resource';
import type { IRRoute, IRWarning } from '../publicTypes';
import { hashCanonical } from './canonical';

const RESERVED_ROUTE_PREFIXES = [
	'/wp/v2',
	'/wp-json',
	'/oembed/1.0',
	'/wp-site-health',
];

const ROUTE_NORMALISATION_REGEX = /\/+$/;

export function normaliseRoutes(options: {
	resourceKey: string;
	routes: ResourceConfig['routes'];
	duplicateDetector: Map<string, { resource: string; route: string }>;
	sanitizedNamespace: string;
}): { routes: IRRoute[]; warnings: IRWarning[] } {
	const { resourceKey, routes, duplicateDetector, sanitizedNamespace } =
		options;
	const irRoutes: IRRoute[] = [];
	const warnings: IRWarning[] = [];

	const routeEntries = Object.entries(routes).filter(
		(entry): entry is [string, ResourceRoute] =>
			typeof entry[1] !== 'undefined'
	);

	for (const [routeKey, route] of routeEntries) {
		const method = route.method.toUpperCase();
		const analysis = analyseRoutePath({
			candidate: route.path,
			resourceKey,
			routeKey,
			sanitizedNamespace,
		});

		// Only check for duplicates on local routes - remote routes can be reused
		// across resources as they don't collide within the WordPress namespace
		if (analysis.transport === 'local') {
			const duplicateKey = `${method} ${analysis.normalisedPath}`;
			if (duplicateDetector.has(duplicateKey)) {
				const existing = duplicateDetector.get(duplicateKey)!;
				throw new KernelError('ValidationError', {
					message: `Duplicate route detected for ${method} ${analysis.normalisedPath}.`,
					context: {
						resource: resourceKey,
						route: routeKey,
						conflict: existing,
					},
				});
			}

			duplicateDetector.set(duplicateKey, {
				resource: resourceKey,
				route: routeKey,
			});
		}

		if (analysis.warnings.length > 0) {
			warnings.push(...analysis.warnings);
		}

		irRoutes.push({
			method,
			path: analysis.normalisedPath,
			policy: route.policy,
			transport: analysis.transport,
			hash: hashCanonical({
				method,
				path: analysis.normalisedPath,
				policy: route.policy ?? null,
				transport: analysis.transport,
			}),
		});
	}

	irRoutes.sort((a, b) => {
		const methodComparison = a.method.localeCompare(b.method);
		if (methodComparison !== 0) {
			return methodComparison;
		}

		return a.path.localeCompare(b.path);
	});

	return { routes: irRoutes, warnings };
}

function analyseRoutePath(options: {
	candidate: string;
	resourceKey: string;
	routeKey: string;
	sanitizedNamespace: string;
}): {
	normalisedPath: string;
	transport: IRRoute['transport'];
	warnings: IRWarning[];
} {
	const { candidate, resourceKey, routeKey, sanitizedNamespace } = options;
	const trimmed = candidate.trim();

	if (!trimmed) {
		throw new KernelError('ValidationError', {
			message: `Route ${routeKey} for resource "${resourceKey}" is empty.`,
			context: { resource: resourceKey, route: routeKey },
		});
	}

	if (trimmed.includes('../') || trimmed.includes('..\\')) {
		throw new KernelError('ValidationError', {
			message: `Route ${routeKey} for resource "${resourceKey}" contains disallowed path traversal segments.`,
			context: { resource: resourceKey, route: routeKey, path: trimmed },
		});
	}

	if (isAbsoluteUrl(trimmed)) {
		return {
			normalisedPath: trimmed,
			transport: 'remote',
			warnings: [
				{
					code: 'route.remote.absolute',
					message: `Route ${routeKey} for resource "${resourceKey}" points to a remote transport (absolute URL).`,
					context: {
						resource: resourceKey,
						route: routeKey,
						path: trimmed,
					},
				},
			],
		};
	}

	const normalised = `/${trimmed.replace(/^\/+/, '')}`.replace(
		ROUTE_NORMALISATION_REGEX,
		''
	);
	const collapsed = normalised.replace(/\/{2,}/g, '/');

	for (const prefix of RESERVED_ROUTE_PREFIXES) {
		if (collapsed.startsWith(prefix)) {
			throw new KernelError('ValidationError', {
				message: `Route ${routeKey} for resource "${resourceKey}" uses reserved prefix "${prefix}".`,
				context: {
					resource: resourceKey,
					route: routeKey,
					path: collapsed,
				},
			});
		}
	}

	const warnings: IRWarning[] = [];
	const namespacePrefix = `/${sanitizedNamespace}/`;
	const transport: IRRoute['transport'] = collapsed.startsWith(
		namespacePrefix
	)
		? 'local'
		: 'remote';

	if (transport === 'remote') {
		warnings.push({
			code: 'route.remote.namespace',
			message: `Route ${routeKey} for resource "${resourceKey}" does not match namespace "${sanitizedNamespace}" and will be treated as remote.`,
			context: {
				resource: resourceKey,
				route: routeKey,
				path: collapsed,
			},
		});
	}

	return { normalisedPath: collapsed || '/', transport, warnings };
}

function isAbsoluteUrl(candidate: string): boolean {
	return candidate.startsWith('http://') || candidate.startsWith('https://');
}
