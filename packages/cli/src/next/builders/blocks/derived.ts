import path from 'node:path';

import type {
	IRBlock,
	IRResource,
	IRRoute,
	IRSchema,
	IRv1,
} from '../../ir/publicTypes';

export interface DerivedResourceBlock {
	readonly block: IRBlock;
	readonly manifest: Record<string, unknown>;
}

export function deriveResourceBlocks(options: {
	readonly ir: IRv1;
	readonly existingBlocks: ReadonlyMap<string, IRBlock>;
}): readonly DerivedResourceBlock[] {
	const { ir, existingBlocks } = options;
	const generatedRoot = path.dirname(ir.php.outputDir);
	const derived: DerivedResourceBlock[] = [];

	for (const resource of ir.resources) {
		if (!shouldGenerateBlock(resource)) {
			continue;
		}

		if (determineBlockType(resource) !== 'js-only') {
			continue;
		}

		const slug = toBlockSlug(resource.name);
		const blockKey = `${ir.config.namespace}/${slug}`;
		if (existingBlocks.has(blockKey)) {
			continue;
		}

		const directory = toPosixPath(path.join(generatedRoot, 'blocks', slug));
		const manifestSource = toPosixPath(path.join(directory, 'block.json'));
		const block: IRBlock = {
			key: blockKey,
			directory,
			hasRender: false,
			manifestSource,
		};
		const manifest = createBlockManifest({
			ir,
			resource,
			blockKey,
		});

		derived.push({ block, manifest });
	}

	return derived;
}

function shouldGenerateBlock(resource: IRResource): boolean {
	const hasGetRoute = resource.routes.some(
		(route: IRRoute) => route.method.toUpperCase() === 'GET'
	);
	const hasUi = Boolean(resource.ui?.admin?.dataviews);
	return hasGetRoute || hasUi;
}

function determineBlockType(resource: IRResource): 'js-only' | 'ssr' {
	const hasStorage = Boolean(resource.storage);
	const hasLocalRoute = resource.routes.some(
		(route: IRRoute) => route.transport === 'local'
	);

	if (hasStorage && hasLocalRoute) {
		return 'ssr';
	}

	return 'js-only';
}

function createBlockManifest(options: {
	readonly ir: IRv1;
	readonly resource: IRResource;
	readonly blockKey: string;
}): Record<string, unknown> {
	const { ir, resource, blockKey } = options;
	const schema = findSchema(ir.schemas, resource.schemaKey);
	const attributes = deriveAttributes(schema);
	const title = toTitleCase(resource.name);

	const manifest: Record<string, unknown> = {
		$schema: 'https://schemas.wp.org/trunk/block.json',
		apiVersion: 3,
		name: blockKey,
		title,
		description: `${title} block generated from project config`,
		category: 'widgets',
		icon: 'database',
		textdomain: ir.config.namespace,
		keywords: [resource.name],
		supports: {
			align: ['wide', 'full'],
			color: {
				background: true,
				text: true,
			},
			spacing: {
				margin: true,
				padding: true,
			},
			typography: {
				fontSize: true,
				lineHeight: true,
			},
		},
		editorScriptModule: 'file:./index.tsx',
		viewScriptModule: 'file:./view.ts',
	};

	if (attributes) {
		manifest.attributes = attributes;
	}

	return manifest;
}

function findSchema(
	schemas: readonly IRSchema[],
	key: string
): IRSchema | undefined {
	return schemas.find((candidate) => candidate.key === key);
}

function deriveAttributes(
	schema: IRSchema | undefined
): Record<string, unknown> | undefined {
	const properties = getSchemaProperties(schema);
	if (!properties) {
		return undefined;
	}

	const entries = Object.entries(properties)
		.map(([name, descriptor]) => deriveAttributeEntry(name, descriptor))
		.filter((entry): entry is [string, Record<string, unknown>] =>
			Boolean(entry)
		);

	return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function deriveAttribute(
	descriptor: Record<string, unknown>
): Record<string, unknown> | undefined {
	const attribute: Record<string, unknown> = {};

	applySchemaType(attribute, descriptor.type);
	applySchemaEnum(attribute, descriptor.enum);

	assignIfDefined(attribute, 'default', descriptor.default);
	assignIfString(attribute, 'description', descriptor.description);

	return Object.keys(attribute).length > 0 ? attribute : undefined;
}

function deriveAttributeEntry(
	name: string,
	descriptor: unknown
): [string, Record<string, unknown>] | undefined {
	if (!isRecord(descriptor)) {
		return undefined;
	}

	const attribute = deriveAttribute(descriptor);
	return attribute ? [name, attribute] : undefined;
}

function inferTypeFromEnum(values: unknown[]): string | undefined {
	const types = new Set(values.map((value) => typeof value));
	if (types.size !== 1) {
		return undefined;
	}

	const [type] = Array.from(types);
	switch (type) {
		case 'string':
			return 'string';
		case 'number':
			return 'number';
		case 'boolean':
			return 'boolean';
		default:
			return undefined;
	}
}

function mapSchemaType(type: string): string | undefined {
	switch (type) {
		case 'string':
		case 'boolean':
		case 'object':
		case 'array':
		case 'number':
		case 'integer':
		case 'null':
			return type;
		default:
			return undefined;
	}
}

function getSchemaProperties(
	schema: IRSchema | undefined
): Record<string, unknown> | undefined {
	if (!schema) {
		return undefined;
	}

	const definition = schema.schema;
	if (!isRecord(definition)) {
		return undefined;
	}

	if ((definition as Record<string, unknown>).type !== 'object') {
		return undefined;
	}

	const properties = (definition as Record<string, unknown>).properties;
	return isRecord(properties) ? properties : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function applySchemaType(
	attribute: Record<string, unknown>,
	typeValue: unknown
): void {
	if (typeof typeValue === 'string') {
		const mapped = mapSchemaType(typeValue);
		if (mapped) {
			attribute.type = mapped;
		}
		return;
	}

	if (!Array.isArray(typeValue)) {
		return;
	}

	const mapped = typeValue
		.map((value) =>
			typeof value === 'string' ? mapSchemaType(value) : undefined
		)
		.filter(Boolean);

	if (mapped.length > 0) {
		attribute.type = mapped;
	}
}

function applySchemaEnum(
	attribute: Record<string, unknown>,
	enumValue: unknown
): void {
	if (!Array.isArray(enumValue) || enumValue.length === 0) {
		return;
	}

	attribute.enum = enumValue;
	if (!attribute.type) {
		const inferred = inferTypeFromEnum(enumValue);
		if (inferred) {
			attribute.type = inferred;
		}
	}
}

function assignIfDefined(
	target: Record<string, unknown>,
	key: string,
	value: unknown
): void {
	if (typeof value !== 'undefined') {
		target[key] = value;
	}
}

function assignIfString(
	target: Record<string, unknown>,
	key: string,
	value: unknown
): void {
	if (typeof value === 'string') {
		target[key] = value;
	}
}

function toBlockSlug(name: string): string {
	return name
		.split(/[^A-Za-z0-9]+/u)
		.filter(Boolean)
		.map((segment) => segment.toLowerCase())
		.join('-');
}

function toTitleCase(value: string): string {
	const segments = value
		.split(/[^A-Za-z0-9]+/u)
		.filter(Boolean)
		.map((segment) => segment.toLowerCase());

	if (segments.length === 0) {
		return 'Resource';
	}

	return segments
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join(' ');
}

function toPosixPath(candidate: string): string {
	return candidate.split(path.sep).join('/');
}
