import type { IRRoute } from '../../../ir/types';

export type ResourceRouteKind = 'list' | 'get' | 'create' | 'update' | 'remove';

const UPDATE_METHODS: ReadonlySet<IRRoute['method']> = new Set([
	'PUT',
	'PATCH',
]);

export function collectCanonicalBasePaths(
	routes: readonly IRRoute[],
	identityParam: string
): Set<string> {
	const basePaths = new Set(
		routes
			.map((route) => extractCanonicalBasePath(route.path, identityParam))
			.filter((value): value is string => typeof value === 'string')
	);

	if (basePaths.size > 0) {
		return basePaths;
	}

	const normalizedNonParamPaths = routes
		.map((route) => normalizeRoutePath(route.path))
		.filter((path) => !path.includes(':'));

	if (normalizedNonParamPaths.length === 0) {
		return basePaths;
	}

	const minimalSegmentCount = Math.min(
		...normalizedNonParamPaths.map((path) => getPathSegments(path).length)
	);

	if (minimalSegmentCount > 1) {
		return basePaths;
	}

	for (const path of normalizedNonParamPaths) {
		if (getPathSegments(path).length === minimalSegmentCount) {
			basePaths.add(path);
		}
	}

	return basePaths;
}

export function determineRouteKind(
	route: IRRoute,
	identityParam: string,
	canonicalBasePaths: Set<string>
): ResourceRouteKind | undefined {
	const normalizedPath = normalizeRoutePath(route.path);

	if (
		matchesIdentityRoute(normalizedPath, identityParam, canonicalBasePaths)
	) {
		if (route.method === 'GET') {
			return 'get';
		}

		if (UPDATE_METHODS.has(route.method)) {
			return 'update';
		}

		if (route.method === 'DELETE') {
			return 'remove';
		}
	}

	if (canonicalBasePaths.has(normalizedPath)) {
		if (route.method === 'GET') {
			return 'list';
		}

		if (route.method === 'POST') {
			return 'create';
		}
	}

	return undefined;
}

function extractCanonicalBasePath(
	path: string,
	identityParam: string
): string | undefined {
	const normalizedPath = normalizeRoutePath(path);
	const segments = getPathSegments(normalizedPath);

	if (segments.length === 0) {
		return undefined;
	}

	if (segments[segments.length - 1] !== `:${identityParam}`) {
		return undefined;
	}

	const baseSegments = segments.slice(0, -1);

	if (baseSegments.some((segment) => segment.startsWith(':'))) {
		return undefined;
	}

	return baseSegments.length > 0 ? `/${baseSegments.join('/')}` : '/';
}

function matchesIdentityRoute(
	normalizedPath: string,
	identityParam: string,
	canonicalBasePaths: Set<string>
): boolean {
	const segments = getPathSegments(normalizedPath);

	if (segments.length === 0) {
		return false;
	}

	if (segments[segments.length - 1] !== `:${identityParam}`) {
		return false;
	}

	const baseSegments = segments.slice(0, -1);
	const basePath =
		baseSegments.length > 0 ? `/${baseSegments.join('/')}` : '/';

	if (!canonicalBasePaths.has(basePath)) {
		return false;
	}

	if (baseSegments.some((segment) => segment.startsWith(':'))) {
		return false;
	}

	return true;
}

export function normalizeRoutePath(path: string): string {
	const ensured = path.startsWith('/') ? path : `/${path}`;
	const collapsed = ensured.replace(/\/+/g, '/');

	if (collapsed === '/') {
		return collapsed;
	}

	const trimmed = collapsed.replace(/\/+$/u, '');

	return trimmed.length > 0 ? trimmed : '/';
}

export function getPathSegments(path: string): string[] {
	if (path === '/') {
		return [];
	}

	return path.split('/').filter(Boolean);
}
