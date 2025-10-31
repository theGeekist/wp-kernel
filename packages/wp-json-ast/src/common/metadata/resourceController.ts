import type {
	ResourceControllerHelperMetadata,
	ResourceControllerMetadata,
	ResourceControllerRouteMetadata,
} from '../../types';
import type { ResourceMetadataHost } from './cache';

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

export type ResourceCacheKeyDescriptor = Readonly<{
	segments: readonly unknown[];
}>;

type OptionalCacheKeyKind = 'create' | 'update' | 'remove';

const OPTIONAL_CACHE_KEY_KINDS: readonly OptionalCacheKeyKind[] = [
	'create',
	'update',
	'remove',
];

const IDENTITY_ROUTE_KINDS = new Set<ResourceControllerRouteMetadata['kind']>([
	'get',
	'update',
	'remove',
]);

export type ResourceCacheKeysPlan = {
	readonly list: ResourceCacheKeyDescriptor;
	readonly get: ResourceCacheKeyDescriptor;
} & Partial<Record<OptionalCacheKeyKind, ResourceCacheKeyDescriptor>>;

export type ResourceCacheKeysSource = ResourceCacheKeysPlan;

export function buildResourceCacheKeysPlan(
	options: ResourceCacheKeysSource
): ResourceCacheKeysPlan {
	return {
		list: cloneCacheKey(options.list),
		get: cloneCacheKey(options.get),
		...cloneOptionalCacheKeys(options),
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
	const identityBasePaths = routes
		.map((route) => extractCanonicalBasePath(route.path, identityParam))
		.filter((value): value is string => typeof value === 'string');

	if (identityBasePaths.length > 0) {
		return new Set(identityBasePaths);
	}

	const normalizedStaticRoutes = routes
		.map((route) => normalizeRoutePath(route.path))
		.filter((path) => !path.includes(':'))
		.map((path) => ({ path, segments: getPathSegments(path) }));

	if (normalizedStaticRoutes.length === 0) {
		return new Set();
	}

	const minimalSegmentCount = Math.min(
		...normalizedStaticRoutes.map((route) => route.segments.length)
	);

	if (minimalSegmentCount > 1) {
		return new Set();
	}

	const canonical = normalizedStaticRoutes
		.filter((route) => route.segments.length === minimalSegmentCount)
		.map((route) => route.path);

	return new Set(canonical);
}

export function determineRouteKind(
	route: RouteDefinition,
	identityParam: string,
	canonicalBasePaths: ReadonlySet<string>
): ResourceRouteKind | undefined {
	const normalizedPath = normalizeRoutePath(route.path);
	const method = route.method.toUpperCase();

	if (
		matchesIdentityRoute(normalizedPath, identityParam, canonicalBasePaths)
	) {
		return identityRouteKindsByMethod[method];
	}

	if (!canonicalBasePaths.has(normalizedPath)) {
		return undefined;
	}

	return collectionRouteKindsByMethod[method];
}

export interface RouteIdentityContext {
	readonly route: RouteDefinition;
	readonly routeKind: ResourceControllerRouteMetadata['kind'];
	readonly identity: ResourceControllerIdentityPlan;
}

export function routeUsesIdentity(context: RouteIdentityContext): boolean {
	if (IDENTITY_ROUTE_KINDS.has(context.routeKind)) {
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

export function appendResourceControllerHelperSignatures(
	host: ResourceMetadataHost,
	signatures: readonly string[]
): void {
	if (signatures.length === 0) {
		return;
	}

	const metadata = host.getMetadata();
	if (metadata.kind !== 'resource-controller') {
		return;
	}

	const current = metadata.helpers ?? { methods: [] };
	const nextMethods = new Set<string>(current.methods);
	for (const signature of signatures) {
		nextMethods.add(signature);
	}

	const helpers: ResourceControllerHelperMetadata = {
		methods: Array.from(nextMethods),
	};

	host.setMetadata({
		...metadata,
		helpers,
	});
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
	if (kind === 'custom') {
		return undefined;
	}

	const descriptor = cacheKeys[kind];
	if (!descriptor) {
		return [];
	}

	return [...descriptor.segments];
}

function cloneCacheKey(
	descriptor: ResourceCacheKeyDescriptor
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
	if (kind === 'create' || kind === 'update' || kind === 'remove') {
		return mutationKinds[kind];
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

function cloneOptionalCacheKeys(
	source: ResourceCacheKeysSource
): Partial<Record<OptionalCacheKeyKind, ResourceCacheKeyDescriptor>> {
	const entries = OPTIONAL_CACHE_KEY_KINDS.flatMap((kind) => {
		const descriptor = source[kind];
		return descriptor ? ([[kind, cloneCacheKey(descriptor)]] as const) : [];
	});

	return Object.fromEntries(entries) as Partial<
		Record<OptionalCacheKeyKind, ResourceCacheKeyDescriptor>
	>;
}

const identityRouteKindsByMethod: Partial<Record<string, ResourceRouteKind>> = {
	GET: 'get',
	PUT: 'update',
	PATCH: 'update',
	DELETE: 'remove',
};

const collectionRouteKindsByMethod: Partial<Record<string, ResourceRouteKind>> =
	{
		GET: 'list',
		POST: 'create',
	};

const mutationKinds: Record<
	'create' | 'update' | 'remove',
	'create' | 'update' | 'delete'
> = {
	create: 'create',
	update: 'update',
	remove: 'delete',
};
