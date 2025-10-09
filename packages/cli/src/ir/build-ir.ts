import crypto from 'node:crypto';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { KernelError } from '@geekist/wp-kernel';
import { sanitizeNamespace } from '@geekist/wp-kernel/namespace';
import { WPK_NAMESPACE } from '@geekist/wp-kernel/namespace/constants';
import type {
	CacheKeyFn,
	CacheKeys,
	ResourceConfig,
	ResourcePostMetaDescriptor,
	ResourceRoute,
} from '@geekist/wp-kernel/resource';
import { resolveFromWorkspace, toWorkspaceRelative } from '../utils';
import type {
	BuildIrOptions,
	IRPolicyHint,
	IRResource,
	IRResourceCacheKey,
	IRRoute,
	IRSchema,
	IRv1,
	SchemaProvenance,
} from './types';

const JSON_SCHEMA_URL = 'https://json-schema.org/draft/2020-12/schema';
const SCHEMA_REGISTRY_BASE_URL = `https://schemas.${WPK_NAMESPACE}.dev`;

const RESERVED_ROUTE_PREFIXES = [
	'/wp/v2',
	'/wp-json',
	'/oembed/1.0',
	'/wp-site-health',
];

const ROUTE_NORMALISATION_REGEX = /\/+$/;

type SchemaAccumulator = {
	entries: IRSchema[];
	byKey: Map<string, IRSchema>;
};

export async function buildIr(options: BuildIrOptions): Promise<IRv1> | never {
	const sanitizedNamespace = sanitizeNamespace(options.namespace);
	if (!sanitizedNamespace) {
		throw new KernelError('ValidationError', {
			message: `Unable to sanitise namespace "${options.namespace}" during IR construction.`,
			context: { namespace: options.namespace },
		});
	}

	const schemaAccumulator: SchemaAccumulator = {
		entries: [],
		byKey: new Map(),
	};

	await loadConfiguredSchemas(options, schemaAccumulator);

	const resources = await buildResources(
		options,
		schemaAccumulator,
		sanitizedNamespace
	);
	const policies = collectPolicyHints(resources);

	const ir: IRv1 = {
		meta: {
			version: 1,
			namespace: options.namespace,
			sourcePath: toWorkspaceRelative(options.sourcePath),
			origin: options.origin,
			sanitizedNamespace,
		},
		config: options.config,
		schemas: sortSchemas(schemaAccumulator.entries),
		resources: sortResources(resources),
		policies: sortPolicies(policies),
		blocks: [],
		php: {
			namespace: createPhpNamespace(sanitizedNamespace),
			autoload: 'inc/',
			outputDir: '.generated/php',
		},
	};

	return ir;
}

async function loadConfiguredSchemas(
	options: BuildIrOptions,
	accumulator: SchemaAccumulator
): Promise<void> {
	const schemaEntries = Object.entries(options.config.schemas);

	for (const [key, schemaConfig] of schemaEntries) {
		const resolvedPath = await resolveSchemaPath(
			schemaConfig.path,
			options.sourcePath
		);

		const schema = await loadJsonSchema(resolvedPath, key);
		const hash = hashCanonical(schema);

		const irSchema: IRSchema = {
			key,
			sourcePath: toWorkspaceRelative(resolvedPath),
			hash,
			schema,
			provenance: 'manual',
		};

		accumulator.entries.push(irSchema);
		accumulator.byKey.set(key, irSchema);
	}
}

async function buildResources(
	options: BuildIrOptions,
	accumulator: SchemaAccumulator,
	sanitizedNamespace: string
): Promise<IRResource[]> {
	const resources: IRResource[] = [];
	const duplicateDetector = new Map<
		string,
		{ resource: string; route: string }
	>();

	const resourceEntries = Object.entries(options.config.resources);

	for (const [resourceKey, resourceConfig] of resourceEntries) {
		const schemaResolution = await resolveResourceSchema(
			resourceKey,
			resourceConfig,
			accumulator,
			sanitizedNamespace
		);

		const routes = normaliseRoutes(
			resourceKey,
			resourceConfig.routes,
			duplicateDetector
		);

		const cacheKeys = deriveCacheKeys(
			resourceConfig.cacheKeys,
			resourceConfig.name
		);

		const queryParams = resourceConfig.queryParams
			? sortObject(resourceConfig.queryParams)
			: undefined;

		const resource: IRResource = {
			name: resourceConfig.name,
			schemaKey: schemaResolution.schemaKey,
			schemaProvenance: schemaResolution.provenance,
			routes,
			cacheKeys,
			identity: resourceConfig.identity,
			storage: resourceConfig.storage,
			queryParams,
			hash: hashCanonical({
				name: resourceConfig.name,
				schemaKey: schemaResolution.schemaKey,
				schemaProvenance: schemaResolution.provenance,
				routes: routes.map((route) => ({
					method: route.method,
					path: route.path,
					policy: route.policy,
				})),
				cacheKeys: serializeCacheKeys(cacheKeys),
				identity: resourceConfig.identity ?? null,
				storage: resourceConfig.storage ?? null,
				queryParams: queryParams ?? null,
			}),
		};

		resources.push(resource);
	}

	return resources;
}

function collectPolicyHints(resources: IRResource[]): IRPolicyHint[] {
	const hints = new Map<string, IRPolicyHint>();

	for (const resource of resources) {
		for (const route of resource.routes) {
			if (route.policy && !hints.has(route.policy)) {
				hints.set(route.policy, {
					key: route.policy,
					source: 'resource',
				});
			}
		}
	}

	return Array.from(hints.values());
}

function sortSchemas(schemas: IRSchema[]): IRSchema[] {
	return schemas.slice().sort((a, b) => a.key.localeCompare(b.key));
}

function sortResources(resources: IRResource[]): IRResource[] {
	return resources.slice().sort((a, b) => {
		const nameComparison = a.name.localeCompare(b.name);
		if (nameComparison !== 0) {
			return nameComparison;
		}

		return a.schemaKey.localeCompare(b.schemaKey);
	});
}

function sortPolicies(policies: IRPolicyHint[]): IRPolicyHint[] {
	return policies.slice().sort((a, b) => a.key.localeCompare(b.key));
}

async function resolveSchemaPath(
	schemaPath: string,
	configPath: string
): Promise<string> {
	if (path.isAbsolute(schemaPath)) {
		await ensureFileExists(schemaPath);
		return schemaPath;
	}

	const configDirectory = path.dirname(configPath);
	const configRelative = path.resolve(configDirectory, schemaPath);

	if (await fileExists(configRelative)) {
		return configRelative;
	}

	const workspaceRelative = resolveFromWorkspace(schemaPath);
	if (await fileExists(workspaceRelative)) {
		return workspaceRelative;
	}

	throw new KernelError('ValidationError', {
		message: `Schema path "${schemaPath}" could not be resolved from ${configPath}.`,
		context: { schemaPath, configPath },
	});
}

async function ensureFileExists(filePath: string): Promise<void> {
	if (!(await fileExists(filePath))) {
		throw new KernelError('ValidationError', {
			message: `Schema file "${filePath}" does not exist.`,
			context: { filePath },
		});
	}
}

async function fileExists(candidate: string): Promise<boolean> {
	try {
		const stats = await fs.stat(candidate);
		return stats.isFile();
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return false;
		}

		throw error;
	}
}

async function loadJsonSchema(filePath: string, key: string): Promise<unknown> {
	try {
		const raw = await fs.readFile(filePath, 'utf8');
		return JSON.parse(raw);
	} catch (error) {
		const message = `Failed to load JSON schema for "${key}" from ${filePath}.`;
		throw new KernelError('ValidationError', {
			message,
			data: error instanceof Error ? { originalError: error } : undefined,
		});
	}
}

async function resolveResourceSchema(
	resourceKey: string,
	resource: ResourceConfig,
	accumulator: SchemaAccumulator,
	sanitizedNamespace: string
): Promise<{ schemaKey: string; provenance: SchemaProvenance }> {
	if (resource.schema === 'auto') {
		const schemaKey = `auto:${resourceKey}`;
		const existing = accumulator.byKey.get(schemaKey);
		if (existing) {
			return { schemaKey, provenance: existing.provenance };
		}

		const synthesizedSchema = synthesiseSchema(
			resource,
			sanitizedNamespace
		);
		const hash = hashCanonical(synthesizedSchema);

		const irSchema: IRSchema = {
			key: schemaKey,
			sourcePath: `[storage:${resourceKey}]`,
			hash,
			schema: synthesizedSchema,
			provenance: 'auto',
			generatedFrom: {
				type: 'storage',
				resource: resourceKey,
			},
		};

		accumulator.entries.push(irSchema);
		accumulator.byKey.set(schemaKey, irSchema);

		return { schemaKey, provenance: 'auto' };
	}

	if (typeof resource.schema === 'string') {
		const irSchema = accumulator.byKey.get(resource.schema);
		if (!irSchema) {
			throw new KernelError('ValidationError', {
				message: `Resource "${resourceKey}" references unknown schema "${resource.schema}".`,
				context: { resource: resourceKey, schema: resource.schema },
			});
		}

		return { schemaKey: resource.schema, provenance: irSchema.provenance };
	}

	throw new KernelError('ValidationError', {
		message: `Resource "${resourceKey}" must declare a schema reference or use 'auto'.`,
		context: { resource: resourceKey },
	});
}

function synthesiseSchema(
	resource: ResourceConfig,
	sanitizedNamespace: string
): Record<string, unknown> {
	const title = toTitleCase(resource.name);
	const baseSchema: Record<string, unknown> = {
		$schema: JSON_SCHEMA_URL,
		$id: `${SCHEMA_REGISTRY_BASE_URL}/${sanitizedNamespace}/${resource.name}.json`,
		title: `${title} Resource`,
		type: 'object',
		additionalProperties: false,
		properties: {},
	};

	const storage = resource.storage;
	if (storage?.mode === 'wp-post' && storage.meta) {
		const properties: Record<string, unknown> = {};
		for (const [metaKey, descriptor] of Object.entries(storage.meta)) {
			properties[metaKey] = createSchemaFromPostMeta(descriptor);
		}

		if (Object.keys(properties).length > 0) {
			baseSchema.properties = sortObject(properties);
		}
	}

	return sortObject(baseSchema);
}

function createSchemaFromPostMeta(
	descriptor: ResourcePostMetaDescriptor
): Record<string, unknown> {
	const type = descriptor.type;
	if (descriptor.single === false) {
		return {
			type: 'array',
			items: { type },
		};
	}

	return { type };
}

function normaliseRoutes(
	resourceKey: string,
	routes: ResourceConfig['routes'],
	duplicateDetector: Map<string, { resource: string; route: string }>
): IRRoute[] {
	const irRoutes: IRRoute[] = [];

	const routeEntries = Object.entries(routes).filter(
		(entry): entry is [string, ResourceRoute] =>
			typeof entry[1] !== 'undefined'
	);

	for (const [routeKey, route] of routeEntries) {
		const method = route.method.toUpperCase();
		const normalizedPath = normaliseRoutePath(
			route.path,
			resourceKey,
			routeKey
		);
		const duplicateKey = `${method} ${normalizedPath}`;

		if (duplicateDetector.has(duplicateKey)) {
			const existing = duplicateDetector.get(duplicateKey)!;
			throw new KernelError('ValidationError', {
				message: `Duplicate route detected for ${method} ${normalizedPath}.`,
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

		irRoutes.push({
			method,
			path: normalizedPath,
			policy: route.policy,
			hash: hashCanonical({
				method,
				path: normalizedPath,
				policy: route.policy ?? null,
			}),
		});
	}

	return irRoutes.sort((a, b) => {
		const methodComparison = a.method.localeCompare(b.method);
		if (methodComparison !== 0) {
			return methodComparison;
		}

		return a.path.localeCompare(b.path);
	});
}

function normaliseRoutePath(
	candidate: string,
	resourceKey: string,
	routeKey: string
): string {
	const trimmed = candidate.trim();

	if (!trimmed) {
		throw new KernelError('ValidationError', {
			message: `Route ${routeKey} for resource "${resourceKey}" is empty.`,
			context: { resource: resourceKey, route: routeKey },
		});
	}

	if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
		throw new KernelError('ValidationError', {
			message: `Route ${routeKey} for resource "${resourceKey}" must be relative, received "${trimmed}".`,
			context: { resource: resourceKey, route: routeKey, path: trimmed },
		});
	}

	if (trimmed.includes('../') || trimmed.includes('..\\')) {
		throw new KernelError('ValidationError', {
			message: `Route ${routeKey} for resource "${resourceKey}" contains disallowed path traversal segments.`,
			context: { resource: resourceKey, route: routeKey, path: trimmed },
		});
	}

	const normalized = `/${trimmed.replace(/^\/+/, '')}`.replace(
		ROUTE_NORMALISATION_REGEX,
		''
	);
	const collapsed = normalized.replace(/\/{2,}/g, '/');

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

	return collapsed || '/';
}

function deriveCacheKeys(
	cacheKeys: CacheKeys<unknown> | undefined,
	resourceName: string
): IRResource['cacheKeys'] {
	const defaults = createDefaultCacheKeySegments(resourceName);

	const evaluate = <T>(
		key: keyof typeof defaults,
		fn: CacheKeyFn<T> | undefined,
		placeholder: T | undefined
	): IRResourceCacheKey => {
		if (!fn) {
			return { segments: defaults[key], source: 'default' };
		}

		try {
			const result =
				typeof placeholder === 'undefined' ? fn() : fn(placeholder);
			if (!Array.isArray(result)) {
				throw new Error('Cache key function must return an array.');
			}

			return {
				segments: Object.freeze(result.map((value) => value)),
				source: 'config',
			};
		} catch (error) {
			const message = `Failed to evaluate cacheKeys.${String(key)} for resource "${resourceName}".`;
			throw new KernelError('ValidationError', {
				message,
				data:
					error instanceof Error
						? { originalError: error }
						: undefined,
			});
		}
	};

	return {
		list: evaluate('list', cacheKeys?.list, undefined),
		get: evaluate('get', cacheKeys?.get, '__wpk_id__' as string | number),
		create: cacheKeys?.create
			? evaluate('create', cacheKeys.create, undefined)
			: undefined,
		update: cacheKeys?.update
			? evaluate(
					'update',
					cacheKeys.update,
					'__wpk_id__' as string | number
				)
			: undefined,
		remove: cacheKeys?.remove
			? evaluate(
					'remove',
					cacheKeys.remove,
					'__wpk_id__' as string | number
				)
			: undefined,
	};
}

function createDefaultCacheKeySegments(resourceName: string): {
	list: readonly unknown[];
	get: readonly unknown[];
	create: readonly unknown[];
	update: readonly unknown[];
	remove: readonly unknown[];
} {
	const idToken = '__wpk_id__';
	const emptyObjectToken = '{}';

	return {
		list: Object.freeze([resourceName, 'list', emptyObjectToken] as const),
		get: Object.freeze([resourceName, 'get', idToken] as const),
		create: Object.freeze([
			resourceName,
			'create',
			emptyObjectToken,
		] as const),
		update: Object.freeze([resourceName, 'update', idToken] as const),
		remove: Object.freeze([resourceName, 'remove', idToken] as const),
	};
}

function serializeCacheKeys(
	cacheKeys: IRResource['cacheKeys']
): Record<string, unknown> {
	const entries: Record<string, unknown> = {
		list: cacheKeys.list,
		get: cacheKeys.get,
	};

	if (cacheKeys.create) {
		entries.create = cacheKeys.create;
	}

	if (cacheKeys.update) {
		entries.update = cacheKeys.update;
	}

	if (cacheKeys.remove) {
		entries.remove = cacheKeys.remove;
	}

	return entries;
}

function hashCanonical(value: unknown): string {
	const serialised = canonicalJson(value);
	return crypto.createHash('sha256').update(serialised, 'utf8').digest('hex');
}

function canonicalJson(value: unknown): string {
	return JSON.stringify(sortValue(value), null, 2).replace(/\r\n/g, '\n');
}

function sortValue(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map((entry) => sortValue(entry));
	}

	if (value && typeof value === 'object') {
		const entries = Object.entries(value as Record<string, unknown>)
			.map(([key, val]) => [key, sortValue(val)] as const)
			.sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

		return Object.fromEntries(entries);
	}

	if (typeof value === 'undefined') {
		// Convert undefined to null for canonical JSON serialization.
		// This ensures undefined values are represented as null in the output,
		// making the serialization consistent and explicit.
		return null;
	}

	return value;
}

function sortObject<T extends Record<string, unknown>>(value: T): T {
	return sortValue(value) as T;
}

function toTitleCase(value: string): string {
	return value
		.split(/[-_:]/)
		.filter(Boolean)
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join(' ');
}

function createPhpNamespace(namespace: string): string {
	const segments = namespace.split('-').filter(Boolean);
	if (segments.length === 0) {
		return 'WPKernel';
	}

	const converted = segments.map((segment) => {
		if (segment.toLowerCase() === 'wp') {
			return 'WP';
		}

		return segment.charAt(0).toUpperCase() + segment.slice(1);
	});
	if (converted.length === 1) {
		return converted[0]!;
	}

	const head = converted.slice(0, -1).join('\\');
	return `${head}\\${converted.at(-1)!}`;
}
