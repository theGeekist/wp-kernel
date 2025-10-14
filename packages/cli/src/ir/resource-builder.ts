import type { ResourceConfig } from '@wpkernel/core/resource';
import { hashCanonical, sortObject } from './canonical';
import type {
	BuildIrOptions,
	IRResource,
	IRWarning,
	SchemaProvenance,
} from './types';
import { deriveCacheKeys, serializeCacheKeys } from './cache-keys';
import { normaliseRoutes } from './routes';
import type { SchemaAccumulator } from './schema';
import { resolveResourceSchema } from './schema';

interface ResourceBuilderState {
	duplicateDetector: Map<string, { resource: string; route: string }>;
	postTypeRegistry: Map<string, string>;
}

export async function buildResources(
	options: BuildIrOptions,
	accumulator: SchemaAccumulator,
	sanitizedNamespace: string
): Promise<IRResource[]> {
	const state: ResourceBuilderState = {
		duplicateDetector: new Map<
			string,
			{ resource: string; route: string }
		>(),
		postTypeRegistry: new Map<string, string>(),
	};

	const resources: IRResource[] = [];
	const resourceEntries = Object.entries(options.config.resources);

	for (const [resourceKey, resourceConfig] of resourceEntries) {
		const resource = await buildResourceEntry({
			accumulator,
			resourceConfig,
			resourceKey,
			sanitizedNamespace,
			state,
		});

		resources.push(resource);
	}

	return resources;
}

async function buildResourceEntry(options: {
	accumulator: SchemaAccumulator;
	sanitizedNamespace: string;
	resourceKey: string;
	resourceConfig: ResourceConfig;
	state: ResourceBuilderState;
}): Promise<IRResource> {
	const {
		accumulator,
		resourceKey,
		resourceConfig,
		sanitizedNamespace,
		state,
	} = options;

	const schemaResolution = await resolveResourceSchema(
		resourceKey,
		resourceConfig,
		accumulator,
		sanitizedNamespace
	);

	const { routes, warnings: routeWarnings } = normaliseRoutes({
		resourceKey,
		routes: resourceConfig.routes,
		duplicateDetector: state.duplicateDetector,
		sanitizedNamespace,
	});

	const identityResult = inferIdentity({
		resourceKey,
		provided: resourceConfig.identity,
		routes,
	});

	const storageResult = prepareStorage({
		resourceKey,
		storage: resourceConfig.storage,
		sanitizedNamespace,
	});

	const warnings = collectWarnings({
		routeWarnings,
		identityResult,
		storageResult,
		postTypeWarnings: recordPostTypeCollision({
			resourceKey,
			registry: state.postTypeRegistry,
			storageResult,
		}),
	});

	const cacheKeys = deriveCacheKeys(
		resourceConfig.cacheKeys,
		resourceConfig.name
	);

	const queryParams = normaliseQueryParams(resourceConfig.queryParams);

	return {
		name: resourceConfig.name,
		schemaKey: schemaResolution.schemaKey,
		schemaProvenance: schemaResolution.provenance,
		routes,
		cacheKeys,
		identity: identityResult.identity,
		storage: storageResult.storage,
		queryParams,
		ui: resourceConfig.ui,
		hash: hashResource({
			resourceConfig,
			schemaKey: schemaResolution.schemaKey,
			schemaProvenance: schemaResolution.provenance,
			routes,
			cacheKeys,
			identity: identityResult.identity,
			storage: storageResult.storage,
			queryParams,
		}),
		warnings,
	};
}

function collectWarnings(options: {
	routeWarnings: IRWarning[];
	identityResult: ReturnType<typeof inferIdentity>;
	storageResult: ReturnType<typeof prepareStorage>;
	postTypeWarnings: IRWarning[];
}): IRWarning[] {
	const warnings: IRWarning[] = [];
	warnings.push(...options.routeWarnings);

	if (options.identityResult.warning) {
		warnings.push(options.identityResult.warning);
	}

	warnings.push(...options.storageResult.warnings);
	warnings.push(...options.postTypeWarnings);

	return sortWarnings(warnings);
}

export function sortWarnings(warnings: IRWarning[]): IRWarning[] {
	return warnings.slice().sort((a, b) => {
		const codeComparison = a.code.localeCompare(b.code);
		if (codeComparison !== 0) {
			return codeComparison;
		}

		return (a.message ?? '').localeCompare(b.message ?? '');
	});
}

export function normaliseQueryParams(
	params: ResourceConfig['queryParams'] | undefined
): ResourceConfig['queryParams'] | undefined {
	if (!params) {
		return undefined;
	}

	return sortObject(params);
}

export function recordPostTypeCollision(options: {
	resourceKey: string;
	registry: Map<string, string>;
	storageResult: ReturnType<typeof prepareStorage>;
}): IRWarning[] {
	const candidate =
		options.storageResult.postType ??
		options.storageResult.explicitPostType;

	if (!candidate) {
		return [];
	}

	const existing = options.registry.get(candidate);
	if (existing && existing !== options.resourceKey) {
		return [
			{
				code: 'storage.wpPost.postType.collision',
				message: `${options.storageResult.postType ? 'Inferred post type' : 'Post type'} "${candidate}" for resource "${options.resourceKey}" collides with resource "${existing}".`,
				context: {
					resource: options.resourceKey,
					postType: candidate,
					existing,
				},
			},
		];
	}

	options.registry.set(candidate, options.resourceKey);

	return [];
}

export function inferIdentity(options: {
	resourceKey: string;
	provided: ResourceConfig['identity'];
	routes: IRResource['routes'];
}): { identity?: ResourceConfig['identity']; warning?: IRWarning } {
	if (options.provided) {
		return { identity: options.provided };
	}

	const placeholder = pickRoutePlaceholder(options.routes);
	if (!placeholder) {
		return {
			identity: undefined,
			warning: {
				code: 'identity.inference.missing',
				message: `Unable to infer identity for resource "${options.resourceKey}". Define resource.identity explicitly.`,
				context: { resource: options.resourceKey },
			},
		};
	}

	const inferred = createIdentityFromPlaceholder(placeholder);
	if (!inferred) {
		return {
			identity: undefined,
			warning: {
				code: 'identity.inference.unsupported',
				message: `Resource "${options.resourceKey}" routes reference :${placeholder} but no default identity mapping exists.`,
				context: { resource: options.resourceKey, placeholder },
			},
		};
	}

	return {
		identity: inferred,
		warning: {
			code: 'identity.inference.applied',
			message: `Resource "${options.resourceKey}" missing identity; inferred ${inferred.type} parameter "${inferred.param ?? 'id'}" from routes.`,
			context: { resource: options.resourceKey, placeholder },
		},
	};
}

export function pickRoutePlaceholder(
	routes: IRResource['routes']
): string | undefined {
	const priority = ['id', 'slug', 'uuid'];
	const matches = new Map<string, number>();

	for (const route of routes) {
		const regex = /:([a-zA-Z0-9_]+)/g;
		let match: RegExpExecArray | null;
		while ((match = regex.exec(route.path))) {
			const token = match[1]?.toLowerCase();
			if (token) {
				matches.set(token, (matches.get(token) ?? 0) + 1);
			}
		}
	}

	for (const candidate of priority) {
		if (matches.has(candidate)) {
			return candidate;
		}
	}

	const [first] = matches.keys();
	return first;
}

export function createIdentityFromPlaceholder(
	placeholder: string
): ResourceConfig['identity'] | undefined {
	switch (placeholder) {
		case 'id':
			return { type: 'number', param: 'id' };
		case 'slug':
			return { type: 'string', param: 'slug' };
		case 'uuid':
			return { type: 'string', param: 'uuid' };
		default:
			return undefined;
	}
}

export function prepareStorage(options: {
	resourceKey: string;
	storage: ResourceConfig['storage'];
	sanitizedNamespace: string;
}): {
	storage?: ResourceConfig['storage'];
	warnings: IRWarning[];
	postType?: string;
	explicitPostType?: string;
} {
	const { resourceKey, storage, sanitizedNamespace } = options;
	if (!storage) {
		return { storage: undefined, warnings: [] };
	}

	if (storage.mode !== 'wp-post') {
		return { storage: { ...storage }, warnings: [] };
	}

	const warnings: IRWarning[] = [];
	if (storage.postType) {
		return {
			storage: { ...storage },
			warnings,
			explicitPostType: storage.postType,
		};
	}

	const inferred = inferPostType({
		resourceKey,
		sanitizedNamespace,
	});

	warnings.push(...inferred.warnings);

	return {
		storage: { ...storage, postType: inferred.postType },
		warnings,
		postType: inferred.postType,
	};
}

export function inferPostType(options: {
	resourceKey: string;
	sanitizedNamespace: string;
}): { postType: string; warnings: IRWarning[] } {
	const warnings: IRWarning[] = [];
	const namespaceSlug = options.sanitizedNamespace
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/_+/g, '_')
		.replace(/^_+|_+$/g, '');
	const resourceSlug = options.resourceKey
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/_+/g, '_')
		.replace(/^_+|_+$/g, '');

	const fallback = resourceSlug ? `wpk_${resourceSlug}` : 'wpk_resource';
	const combined =
		[namespaceSlug, resourceSlug].filter(Boolean).join('_') || fallback;
	const trimmed = combined.slice(0, 20);

	if (combined.length > 20) {
		warnings.push({
			code: 'storage.wpPost.postType.truncated',
			message: `Derived post type "${combined}" for resource "${options.resourceKey}" exceeds 20 characters; truncated to "${trimmed}".`,
			context: { resource: options.resourceKey, postType: trimmed },
		});
	}

	return { postType: trimmed, warnings };
}

export function hashResource(options: {
	resourceConfig: ResourceConfig;
	schemaKey: string;
	schemaProvenance: SchemaProvenance;
	routes: IRResource['routes'];
	cacheKeys: IRResource['cacheKeys'];
	identity: ResourceConfig['identity'];
	storage: ResourceConfig['storage'];
	queryParams: ResourceConfig['queryParams'];
}): string {
	return hashCanonical({
		name: options.resourceConfig.name,
		schemaKey: options.schemaKey,
		schemaProvenance: options.schemaProvenance,
		routes: options.routes.map((route) => ({
			method: route.method,
			path: route.path,
			policy: route.policy,
			transport: route.transport,
		})),
		cacheKeys: serializeCacheKeys(options.cacheKeys),
		identity: options.identity ?? null,
		storage: options.storage ?? null,
		queryParams: options.queryParams ?? null,
		ui: options.resourceConfig.ui ?? null,
	});
}
