import path from 'node:path';
import { promises as fs } from 'node:fs';
import { KernelError } from '@geekist/wp-kernel/error';
import { WPK_NAMESPACE } from '@geekist/wp-kernel/namespace/constants';
import type {
	ResourceConfig,
	ResourcePostMetaDescriptor,
} from '@geekist/wp-kernel/resource';
import type { BuildIrOptions, IRSchema, SchemaProvenance } from './types';
import { resolveFromWorkspace, toWorkspaceRelative } from '../utils';
import { hashCanonical, sortObject } from './canonical';

const JSON_SCHEMA_URL = 'https://json-schema.org/draft/2020-12/schema';
const SCHEMA_REGISTRY_BASE_URL = `https://schemas.${WPK_NAMESPACE}.dev`;

export interface SchemaAccumulator {
	entries: IRSchema[];
	byKey: Map<string, IRSchema>;
}

export function createSchemaAccumulator(): SchemaAccumulator {
	return { entries: [], byKey: new Map() };
}

export async function loadConfiguredSchemas(
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

export async function resolveResourceSchema(
	resourceKey: string,
	resource: ResourceConfig,
	accumulator: SchemaAccumulator,
	sanitizedNamespace: string
): Promise<{ schemaKey: string; provenance: SchemaProvenance }> {
	const schema = inferSchemaSetting(resource);

	if (schema === 'auto') {
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

	if (typeof schema !== 'string') {
		throw new KernelError('ValidationError', {
			message: `Resource "${resourceKey}" must declare a schema reference or use 'auto'.`,
			context: { resource: resourceKey },
		});
	}

	const irSchema = accumulator.byKey.get(schema);
	if (!irSchema) {
		throw new KernelError('ValidationError', {
			message: `Resource "${resourceKey}" references unknown schema "${schema}".`,
			context: { resource: resourceKey, schema },
		});
	}

	return { schemaKey: schema, provenance: irSchema.provenance };
}

export function inferSchemaSetting(
	resource: ResourceConfig
): ResourceConfig['schema'] | 'auto' {
	if (resource.schema) {
		return resource.schema;
	}

	if (resource.storage) {
		return 'auto';
	}

	return resource.schema;
}

export async function resolveSchemaPath(
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

export async function ensureFileExists(filePath: string): Promise<void> {
	if (!(await fileExists(filePath))) {
		throw new KernelError('ValidationError', {
			message: `Schema file "${filePath}" does not exist.`,
			context: { filePath },
		});
	}
}

export async function fileExists(candidate: string): Promise<boolean> {
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

export async function loadJsonSchema(
	filePath: string,
	key: string
): Promise<unknown> {
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

export function synthesiseSchema(
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

export function createSchemaFromPostMeta(
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

export function toTitleCase(value: string): string {
	return value
		.split(/[-_:]/)
		.filter(Boolean)
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join(' ');
}
