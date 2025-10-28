import type {
	ResourceControllerMetadata,
	ResourceControllerRouteMetadata,
} from '../../types';

export type ResourceRouteKind = 'list' | 'get' | 'create' | 'update' | 'remove';

export interface RouteDefinition {
	readonly method: string;
	readonly path: string;
}

export interface ResourceControllerIdentityPlan {
	readonly param: string;
}

export interface ResourceControllerIdentityMetadataPlan
	extends ResourceControllerIdentityPlan {
	readonly type: 'number' | 'string';
}

export interface ResourceCacheKeyDescriptor {
	readonly segments: readonly unknown[];
}

export interface ResourceCacheKeysPlan {
	readonly list: ResourceCacheKeyDescriptor;
	readonly get: ResourceCacheKeyDescriptor;
	readonly create?: ResourceCacheKeyDescriptor;
	readonly update?: ResourceCacheKeyDescriptor;
	readonly remove?: ResourceCacheKeyDescriptor;
}

export interface ResourceCacheKeySource {
	readonly segments: readonly unknown[];
}

export interface ResourceCacheKeysSource {
	readonly list: ResourceCacheKeySource;
	readonly get: ResourceCacheKeySource;
	readonly create?: ResourceCacheKeySource;
	readonly update?: ResourceCacheKeySource;
	readonly remove?: ResourceCacheKeySource;
}

export function buildResourceCacheKeysPlan(
	options: ResourceCacheKeysSource
): ResourceCacheKeysPlan {
	return {
		list: cloneDescriptor(options.list),
		get: cloneDescriptor(options.get),
		...(options.create ? { create: cloneDescriptor(options.create) } : {}),
		...(options.update ? { update: cloneDescriptor(options.update) } : {}),
		...(options.remove ? { remove: cloneDescriptor(options.remove) } : {}),
	} as const;
}

export interface RouteMutationMetadataPlan {
	readonly channelTag: string;
}

export interface BuildResourceControllerRouteMetadataOptions {
	readonly routes: readonly RouteDefinition[];
	readonly identity: ResourceControllerIdentityPlan;
	readonly canonicalBasePaths: ReadonlySet<string>;
	readonly cacheKeys: ResourceCacheKeysPlan;
	readonly mutationMetadata?: RouteMutationMetadataPlan;
}

export interface BuildResourceControllerMetadataOptions {
	readonly name: string;
	readonly identity: ResourceControllerIdentityMetadataPlan;
	readonly routes: readonly RouteDefinition[];
	readonly cacheKeys: ResourceCacheKeysPlan;
	readonly mutationMetadata?: RouteMutationMetadataPlan;
}

export function buildResourceControllerMetadata(
	options: BuildResourceControllerMetadataOptions
): ResourceControllerMetadata {
	const canonicalBasePaths = collectCanonicalBasePaths(
		options.routes,
		options.identity.param
	);

	const routes = buildResourceControllerRouteMetadata({
		routes: options.routes,
		identity: { param: options.identity.param },
		canonicalBasePaths,
		cacheKeys: options.cacheKeys,
		mutationMetadata: options.mutationMetadata,
	});

	return {
		kind: 'resource-controller',
		name: options.name,
		identity: {
			type: options.identity.type,
			param: options.identity.param,
		},
		routes,
	} satisfies ResourceControllerMetadata;
}

export function normalizeRoutePath(path: string): string {
	const ensured = path.startsWith('/') ? path : `/${path}`;
	const collapsed = ensured.replace(/\/+/gu, '/');

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

export function collectCanonicalBasePaths(
	routes: readonly RouteDefinition[],
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
	route: RouteDefinition,
	identityParam: string,
	canonicalBasePaths: ReadonlySet<string>
): ResourceRouteKind | undefined {
	const normalizedPath = normalizeRoutePath(route.path);

	if (
		matchesIdentityRoute(normalizedPath, identityParam, canonicalBasePaths)
	) {
		if (route.method === 'GET') {
			return 'get';
		}

		if (route.method === 'PUT' || route.method === 'PATCH') {
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

export interface RouteIdentityContext {
	readonly route: RouteDefinition;
	readonly routeKind: ResourceControllerRouteMetadata['kind'];
	readonly identity: ResourceControllerIdentityPlan;
}

export function routeUsesIdentity(context: RouteIdentityContext): boolean {
	if (
		context.routeKind === 'get' ||
		context.routeKind === 'update' ||
		context.routeKind === 'remove'
	) {
		return true;
	}

	const placeholder = `:${context.identity.param.toLowerCase()}`;
	return context.route.path.toLowerCase().includes(placeholder);
}

export function buildResourceControllerRouteMetadata(
	options: BuildResourceControllerRouteMetadataOptions
): ResourceControllerRouteMetadata[] {
	return options.routes.map((route) => buildRouteMetadata(route, options));
}

function buildRouteMetadata(
	route: RouteDefinition,
	options: BuildResourceControllerRouteMetadataOptions
): ResourceControllerRouteMetadata {
	const kind =
		determineRouteKind(
			route,
			options.identity.param,
			options.canonicalBasePaths
		) ?? 'custom';

	const cacheSegments = resolveCacheSegments(kind, options.cacheKeys);
	const tags = buildMutationTags(options.mutationMetadata, kind);

	return {
		method: route.method,
		path: route.path,
		kind,
		...(cacheSegments ? { cacheSegments } : {}),
		...(tags ? { tags } : {}),
	} satisfies ResourceControllerRouteMetadata;
}

function resolveCacheSegments(
	kind: ResourceControllerRouteMetadata['kind'],
	cacheKeys: ResourceCacheKeysPlan
): readonly unknown[] | undefined {
	const fallback = {
		list: [...cacheKeys.list.segments],
		get: [...cacheKeys.get.segments],
		create: [...(cacheKeys.create?.segments ?? [])],
		update: [...(cacheKeys.update?.segments ?? [])],
		remove: [...(cacheKeys.remove?.segments ?? [])],
		custom: undefined,
	} as const;

	return fallback[kind];
}

function cloneDescriptor(
	descriptor: ResourceCacheKeySource
): ResourceCacheKeyDescriptor {
	return { segments: [...descriptor.segments] };
}

function buildMutationTags(
	metadata: RouteMutationMetadataPlan | undefined,
	kind: ResourceControllerRouteMetadata['kind']
): Readonly<Record<string, string>> | undefined {
	if (!metadata) {
		return undefined;
	}

	const mutationKind = mapToMutationKind(kind);
	if (!mutationKind) {
		return undefined;
	}

	return { [metadata.channelTag]: mutationKind } as const;
}

function mapToMutationKind(
	kind: ResourceControllerRouteMetadata['kind']
): 'create' | 'update' | 'delete' | undefined {
	switch (kind) {
		case 'create':
			return 'create';
		case 'update':
			return 'update';
		case 'remove':
			return 'delete';
		default:
			return undefined;
	}
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
	canonicalBasePaths: ReadonlySet<string>
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
