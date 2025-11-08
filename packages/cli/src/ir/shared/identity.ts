import type {
	IRCapabilityDefinition,
	IRResource,
	IRSchema,
} from '../publicTypes';
import { buildHashProvenance } from './hashing';
import { hashCanonical } from './canonical';

const RESOURCE_PREFIX = 'res:';
const SCHEMA_PREFIX = 'sch:';
const BLOCK_PREFIX = 'blk:';
const CAPABILITY_PREFIX = 'cap:';

export function createResourceId(options: {
	namespace: string;
	key: string;
	name: string;
	routes: IRResource['routes'];
}): string {
	const digest = hashCanonical({
		namespace: options.namespace,
		key: options.key,
		name: options.name,
		routes: options.routes.map((route) => ({
			method: route.method,
			path: route.path,
			transport: route.transport,
		})),
	});

	return `${RESOURCE_PREFIX}${digest}`;
}

export function createSchemaId(options: {
	key: string;
	sourcePath: string;
	schema: unknown;
	provenance: IRSchema['provenance'];
}): string {
	const digest = hashCanonical({
		key: options.key,
		provenance: options.provenance,
		sourcePath: options.sourcePath,
		schema: options.schema,
	});

	return `${SCHEMA_PREFIX}${digest}`;
}

export function createBlockId(options: {
	key: string;
	manifestSource: string;
	directory: string;
}): string {
	const digest = hashCanonical({
		key: options.key,
		manifest: options.manifestSource,
		directory: options.directory,
	});

	return `${BLOCK_PREFIX}${digest}`;
}

export function createCapabilityId(options: {
	definition: Omit<IRCapabilityDefinition, 'id'>;
}): string {
	const digest = hashCanonical({
		key: options.definition.key,
		capability: options.definition.capability,
		appliesTo: options.definition.appliesTo,
		binding: options.definition.binding ?? null,
		source: options.definition.source,
	});

	return `${CAPABILITY_PREFIX}${digest}`;
}

export function createBlockHash(options: {
	key: string;
	directory: string;
	hasRender: boolean;
	manifestSource: string;
}) {
	return buildHashProvenance(
		['key', 'directory', 'hasRender', 'manifestSource'],
		options
	);
}
