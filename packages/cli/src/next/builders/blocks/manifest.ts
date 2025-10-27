import path from 'node:path';
import type { Workspace } from '../../workspace/types';
import type { IRBlock } from '../../../ir/types';
import { buildBlockRegistrarMetadata } from '../ts/shared/metadata';
import type { BlockRegistrarMetadata } from '../ts/shared/metadata';

export interface BlockManifestEntry {
	readonly directory: string;
	readonly manifest: string;
	readonly render?: string;
}

export interface GeneratedFile {
	readonly path: string;
	readonly contents: string;
}

export interface ProcessedBlockManifest {
	readonly block: IRBlock;
	readonly manifestEntry?: BlockManifestEntry;
	readonly manifestAbsolutePath?: string;
	readonly manifestDirectory?: string;
	readonly manifestObject?: Record<string, unknown>;
	readonly warnings: readonly string[];
	readonly renderPath?: {
		readonly absolutePath: string;
		readonly relativePath: string;
	};
	readonly renderStub?: GeneratedFile;
	readonly registrar: BlockRegistrarMetadata;
}

interface BlockManifestCache {
	key: string;
	data: Map<string, ProcessedBlockManifest>;
}

const BLOCK_CACHE = new WeakMap<Workspace, BlockManifestCache>();

export interface CollectBlockManifestsOptions {
	readonly workspace: Workspace;
	readonly blocks: readonly IRBlock[];
}

export async function collectBlockManifests({
	workspace,
	blocks,
}: CollectBlockManifestsOptions): Promise<Map<string, ProcessedBlockManifest>> {
	const cacheKey = buildCacheKey(blocks);
	const cached = BLOCK_CACHE.get(workspace);
	if (cached && cached.key === cacheKey) {
		return cached.data;
	}

	const map = new Map<string, ProcessedBlockManifest>();

	for (const block of [...blocks].sort((a, b) =>
		a.key.localeCompare(b.key)
	)) {
		const processed = await processBlock(workspace, block);
		map.set(block.key, processed);
	}

	BLOCK_CACHE.set(workspace, { key: cacheKey, data: map });
	return map;
}

function buildCacheKey(blocks: readonly IRBlock[]): string {
	return blocks
		.map((block) =>
			[
				block.key,
				block.directory,
				block.manifestSource,
				block.hasRender ? '1' : '0',
			].join('::')
		)
		.join('|');
}

async function processBlock(
	workspace: Workspace,
	block: IRBlock
): Promise<ProcessedBlockManifest> {
	const registrar = buildBlockRegistrarMetadata(block.key);
	const warnings: string[] = [];
	const manifestAbsolutePath = workspace.resolve(block.manifestSource);
	const manifestDirectory = path.dirname(manifestAbsolutePath);
	const manifestRelativePath = toWorkspaceRelative(
		workspace,
		manifestAbsolutePath
	);
	const blockDirectoryAbsolute = workspace.resolve(block.directory);
	const blockDirectoryRelative = toWorkspaceRelative(
		workspace,
		blockDirectoryAbsolute
	);

	const manifestRead = await readManifest(workspace, block);
	warnings.push(...manifestRead.warnings);

	if (!manifestRead.manifestObject) {
		return {
			block,
			warnings,
			registrar,
		} satisfies ProcessedBlockManifest;
	}

	let manifestEntry: BlockManifestEntry = {
		directory: blockDirectoryRelative,
		manifest: manifestRelativePath,
	} satisfies BlockManifestEntry;

	const renderResolution = await resolveRenderResolution({
		workspace,
		manifestDirectory,
		manifestObject: manifestRead.manifestObject,
	});

	const manifestDeclaresCallback = manifestDeclaresRenderCallback(
		manifestRead.manifestObject
	);

	let renderStub: GeneratedFile | undefined;
	let renderPath: { absolutePath: string; relativePath: string } | undefined;

	if (manifestDeclaresCallback) {
		// Manifest provides callable render; no render file needed.
		return {
			block,
			manifestEntry,
			manifestAbsolutePath,
			manifestDirectory,
			manifestObject: manifestRead.manifestObject,
			warnings,
			registrar,
		} satisfies ProcessedBlockManifest;
	}

	if (renderResolution) {
		const { absolutePath, relativePath, exists, declared } =
			renderResolution;
		renderPath = { absolutePath, relativePath };
		manifestEntry = {
			...manifestEntry,
			render: relativePath,
		} satisfies BlockManifestEntry;

		if (!exists) {
			if (declared) {
				renderStub = {
					path: absolutePath,
					contents: createRenderStub({
						block,
						manifest: manifestRead.manifestObject,
					}),
				} satisfies GeneratedFile;
				warnings.push(
					`Block "${block.key}": render file declared in manifest was missing; created stub at ${relativePath}.`
				);
			} else {
				warnings.push(
					`Block "${block.key}": expected render template at ${relativePath} but it was not found.`
				);
			}
		}

		return {
			block,
			manifestEntry,
			manifestAbsolutePath,
			manifestDirectory,
			manifestObject: manifestRead.manifestObject,
			warnings,
			renderPath,
			renderStub,
			registrar,
		} satisfies ProcessedBlockManifest;
	}

	const fallbackAbsolute = path.resolve(blockDirectoryAbsolute, 'render.php');
	const fallbackRelative = toWorkspaceRelative(workspace, fallbackAbsolute);
	const exists = await workspace.exists(fallbackAbsolute);

	renderPath = {
		absolutePath: fallbackAbsolute,
		relativePath: fallbackRelative,
	};
	manifestEntry = {
		...manifestEntry,
		render: fallbackRelative,
	} satisfies BlockManifestEntry;

	if (!exists) {
		renderStub = {
			path: fallbackAbsolute,
			contents: createRenderStub({
				block,
				manifest: manifestRead.manifestObject,
			}),
		} satisfies GeneratedFile;
		warnings.push(
			`Block "${block.key}": render template was not declared and none was found; created stub at ${fallbackRelative}.`
		);
	}

	return {
		block,
		manifestEntry,
		manifestAbsolutePath,
		manifestDirectory,
		manifestObject: manifestRead.manifestObject,
		warnings,
		renderPath,
		renderStub,
		registrar,
	} satisfies ProcessedBlockManifest;
}

async function readManifest(
	workspace: Workspace,
	block: IRBlock
): Promise<{
	manifestObject: Record<string, unknown> | null;
	warnings: string[];
}> {
	const warnings: string[] = [];
	try {
		const contents = await workspace.readText(block.manifestSource);
		if (!contents) {
			warnings.push(
				`Block "${block.key}": Unable to read manifest at ${block.manifestSource}: File not found.`
			);
			return { manifestObject: null, warnings };
		}

		try {
			const parsed = JSON.parse(contents) as Record<string, unknown>;
			warnings.push(
				...validateBlockManifest(parsed, block).map(
					(message) => `Block "${block.key}": ${message}`
				)
			);
			return { manifestObject: parsed, warnings };
		} catch (error) {
			warnings.push(
				`Block "${block.key}": Invalid JSON in block manifest ${block.manifestSource}: ${String(
					error
				)}`
			);
			return { manifestObject: null, warnings };
		}
	} catch (error) {
		warnings.push(
			`Block "${block.key}": Unable to read manifest at ${block.manifestSource}: ${String(
				error
			)}`
		);
		return { manifestObject: null, warnings };
	}
}

function validateBlockManifest(
	manifest: Record<string, unknown>,
	block: IRBlock
): string[] {
	const warnings: string[] = [];

	const checks: Array<{ condition: boolean; message: string }> = [
		{
			condition: isNonEmptyString(manifest.name),
			message: `Block manifest for "${block.key}" is missing a "name" field.`,
		},
		{
			condition: isNonEmptyString(manifest.title),
			message: `Block manifest for "${block.key}" is missing a "title" field.`,
		},
		{
			condition: isNonEmptyString(manifest.category),
			message: `Block manifest for "${block.key}" is missing a "category" field.`,
		},
		{
			condition: isNonEmptyString(manifest.icon),
			message: `Block manifest for "${block.key}" does not define an "icon".`,
		},
		{
			condition:
				hasString(manifest.editorScript) ||
				hasString(manifest.editorScriptModule),
			message: `Block manifest for "${block.key}" is missing "editorScript" or "editorScriptModule".`,
		},
	];

	for (const check of checks) {
		if (!check.condition) {
			warnings.push(check.message);
		}
	}

	if (
		!block.hasRender &&
		!(
			hasString(manifest.viewScript) ||
			hasString(manifest.viewScriptModule)
		)
	) {
		warnings.push(
			`JS-only block "${block.key}" is missing "viewScript" or "viewScriptModule".`
		);
	}

	return warnings;
}

function isNonEmptyString(candidate: unknown): candidate is string {
	return typeof candidate === 'string' && candidate.trim().length > 0;
}

function hasString(candidate: unknown): candidate is string {
	return typeof candidate === 'string' && candidate.length > 0;
}

function manifestDeclaresRenderCallback(
	manifest: Record<string, unknown>
): boolean {
	const render = manifest.render;
	if (typeof render !== 'string') {
		return false;
	}

	const trimmed = render.trim();
	if (trimmed.length === 0) {
		return false;
	}

	return !trimmed.startsWith('file:');
}

async function resolveRenderResolution(options: {
	readonly workspace: Workspace;
	readonly manifestDirectory: string;
	readonly manifestObject: Record<string, unknown>;
}): Promise<
	| {
			readonly absolutePath: string;
			readonly relativePath: string;
			readonly exists: boolean;
			readonly declared: boolean;
	  }
	| undefined
> {
	const { workspace, manifestDirectory, manifestObject } = options;
	const render = manifestObject.render;

	if (typeof render === 'string') {
		if (!render.startsWith('file:')) {
			return undefined;
		}

		const relative = render.slice('file:'.length).trim();
		const normalised = relative.startsWith('./')
			? relative.slice(2)
			: relative;
		const absolutePath = path.resolve(manifestDirectory, normalised);
		const relativePath = toWorkspaceRelative(workspace, absolutePath);
		const exists = await workspace.exists(absolutePath);

		return {
			absolutePath,
			relativePath,
			exists,
			declared: true,
		};
	}

	const fallbackAbsolute = path.resolve(manifestDirectory, 'render.php');
	const exists = await workspace.exists(fallbackAbsolute);
	if (!exists) {
		return undefined;
	}

	return {
		absolutePath: fallbackAbsolute,
		relativePath: toWorkspaceRelative(workspace, fallbackAbsolute),
		exists: true,
		declared: false,
	};
}

function createRenderStub(options: {
	readonly block: IRBlock;
	readonly manifest: Record<string, unknown>;
}): string {
	const title = deriveTitle(options.block, options.manifest);
	const textdomain = deriveTextdomain(options.block, options.manifest);
	const message = `${title} - hello from a dynamic block!`;

	const escapedMessage = escapeForSingleQuotedPhp(message);
	const escapedDomain = escapeForSingleQuotedPhp(textdomain);

	return `<?php\n/**\n * AUTO-GENERATED WPK STUB: safe to edit.\n *\n * @see https://github.com/WordPress/gutenberg/blob/trunk/docs/reference-guides/block-api/block-metadata.md#render\n */\n?>\n<p <?php echo get_block_wrapper_attributes(); ?>>\n\t<?php esc_html_e( '${escapedMessage}', '${escapedDomain}' ); ?>\n</p>\n`;
}

function deriveTitle(
	block: IRBlock,
	manifest: Record<string, unknown>
): string {
	const title =
		typeof manifest.title === 'string' ? manifest.title.trim() : '';
	if (title.length > 0) {
		return title;
	}

	const [, slug] = block.key.split('/');
	if (!slug) {
		return 'Block';
	}

	return slug
		.split(/[^A-Za-z0-9]+/u)
		.filter(Boolean)
		.map(
			(segment) =>
				segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase()
		)
		.join(' ');
}

function deriveTextdomain(
	block: IRBlock,
	manifest: Record<string, unknown>
): string {
	const candidate =
		typeof manifest.textdomain === 'string'
			? manifest.textdomain.trim()
			: '';
	if (candidate.length > 0) {
		return candidate;
	}

	const [namespace] = block.key.split('/');
	return namespace && namespace.length > 0 ? namespace : 'messages';
}

function escapeForSingleQuotedPhp(value: string): string {
	return value.replace(/\\/gu, '\\\\').replace(/'/gu, "\\'");
}

function toWorkspaceRelative(workspace: Workspace, absolute: string): string {
	const relative = path.relative(workspace.root, absolute);
	if (relative === '') {
		return '.';
	}

	return relative.split(path.sep).join('/');
}
