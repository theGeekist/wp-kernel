/**
 * Block Printers
 *
 * Generates registration code for WordPress blocks from IR.
 * Handles both JS-only blocks (Phase 3A) and SSR blocks (Phase 3B).
 *
 * @module printers/blocks
 */

import path from 'node:path';
import type { PrinterContext } from '../types.js';
import type { IRBlock, IRResource, IRSchema } from '../../ir/types.js';
import { generateJSOnlyBlocks } from './js-only.js';
import type { BlockPrinterResult } from './types.js';

export * from './types.js';
export * from './js-only.js';
export * from './ssr.js';

interface DerivedBlockManifest {
	block: IRBlock;
	manifestPath: string;
	contents: Record<string, unknown>;
}

export async function emitBlockArtifacts(
	context: PrinterContext
): Promise<void> {
	const projectRoot = resolveProjectRoot(context);
	const blocksRoot = path.join(context.outputDir, 'blocks');
	await context.ensureDirectory(blocksRoot);

	const existingBlocks = new Map(
		context.ir.blocks.map((block) => [block.key, block])
	);

	const manualJsOnlyBlocks = context.ir.blocks.filter(
		(block) => !block.hasRender
	);

	const derived = inferJsOnlyBlocks({
		context,
		projectRoot,
		existingBlocks,
	});

	for (const manifest of derived.manifests) {
		await context.ensureDirectory(path.dirname(manifest.manifestPath));
		const contents = `${JSON.stringify(manifest.contents, null, 2)}\n`;
		await context.writeFile(manifest.manifestPath, contents);
	}

	const jsOnlyBlocks: IRBlock[] = [];
	const merged = new Map<string, IRBlock>();
	for (const block of [...manualJsOnlyBlocks, ...derived.blocks]) {
		if (!merged.has(block.key)) {
			merged.set(block.key, block);
		}
	}

	jsOnlyBlocks.push(...Array.from(merged.values()).sort(compareBlocks));

	const jsResult = await generateJSOnlyBlocks({
		blocks: jsOnlyBlocks,
		outputDir: blocksRoot,
		projectRoot,
		source: context.ir.meta.origin,
	});

	await writeGeneratedFiles(jsResult, context);
	reportWarnings(jsResult, context);
}

function compareBlocks(a: IRBlock, b: IRBlock): number {
	return a.key.localeCompare(b.key);
}

function resolveProjectRoot(context: PrinterContext): string {
	if (context.configDirectory) {
		return context.configDirectory;
	}

	const inferredPath = path.resolve(
		process.cwd(),
		context.ir.meta.sourcePath
	);
	return path.dirname(inferredPath);
}

function inferJsOnlyBlocks(options: {
	context: PrinterContext;
	projectRoot: string;
	existingBlocks: Map<string, IRBlock>;
}): { blocks: IRBlock[]; manifests: DerivedBlockManifest[] } {
	const { context, projectRoot, existingBlocks } = options;
	const inferredBlocks: IRBlock[] = [];
	const manifests: DerivedBlockManifest[] = [];

	for (const resource of context.ir.resources) {
		if (!shouldGenerateBlock(resource)) {
			continue;
		}

		if (determineBlockType(resource) !== 'js-only') {
			continue;
		}

		const blockKey = `${context.ir.config.namespace}/${toBlockSlug(
			resource.name
		)}`;

		if (existingBlocks.has(blockKey)) {
			inferredBlocks.push(existingBlocks.get(blockKey)!);
			continue;
		}

		const blockDir = path.join(
			context.outputDir,
			'blocks',
			toBlockSlug(resource.name)
		);
		const manifestPath = path.join(blockDir, 'block.json');
		const manifest = createBlockManifest({
			context,
			resource,
			blockKey,
		});

		const relativeDirectory = toPosixPath(
			path.relative(projectRoot, blockDir)
		);
		const relativeManifest = toPosixPath(
			path.relative(projectRoot, manifestPath)
		);

		const block: IRBlock = {
			key: blockKey,
			directory: relativeDirectory,
			hasRender: false,
			manifestSource: relativeManifest,
		};

		inferredBlocks.push(block);
		manifests.push({ block, manifestPath, contents: manifest });
	}

	return { blocks: inferredBlocks, manifests };
}

function shouldGenerateBlock(resource: IRResource): boolean {
	const hasGetRoute = resource.routes.some(
		(route) => route.method.toUpperCase() === 'GET'
	);
	const hasUI = Boolean(resource.ui?.admin?.dataviews);
	return hasGetRoute || hasUI;
}

function determineBlockType(resource: IRResource): 'js-only' | 'ssr' {
	const hasStorage = Boolean(resource.storage);
	const hasLocalRoute = resource.routes.some(
		(route) => route.transport === 'local'
	);

	if (hasStorage && hasLocalRoute) {
		return 'ssr';
	}

	return 'js-only';
}

function createBlockManifest(options: {
	context: PrinterContext;
	resource: IRResource;
	blockKey: string;
}): Record<string, unknown> {
	const { context, resource, blockKey } = options;
	const schema = findSchema(context.ir.schemas, resource.schemaKey);
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
		textdomain: context.ir.config.namespace,
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

function findSchema(schemas: IRSchema[], key: string): IRSchema | undefined {
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

	if (definition.type !== 'object') {
		return undefined;
	}

	const properties = definition.properties;
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

async function writeGeneratedFiles(
	result: BlockPrinterResult,
	context: PrinterContext
): Promise<void> {
	for (const file of result.files) {
		await context.ensureDirectory(path.dirname(file.path));
		const shouldFormat =
			file.path.endsWith('.ts') || file.path.endsWith('.tsx');
		const formatted = shouldFormat
			? await context.formatTs(file.path, file.content)
			: file.content;
		await context.writeFile(file.path, formatted);
	}
}

function reportWarnings(
	result: BlockPrinterResult,
	context: PrinterContext
): void {
	if (result.warnings.length === 0) {
		return;
	}

	const reporter = context.adapterContext?.reporter;
	if (!reporter) {
		return;
	}

	for (const warning of result.warnings) {
		reporter.warn?.(warning);
	}
}
