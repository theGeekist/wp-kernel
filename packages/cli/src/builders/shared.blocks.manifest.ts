import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Workspace } from '../workspace/types';
import type { IRBlock } from '../ir/publicTypes';
import { buildBlockRegistrarMetadata } from './ts/shared.metadata';
import type { BlockRegistrarMetadata } from './ts/types';

/**
 * Minimal metadata persisted for each discovered `block.json`.
 *
 * @category Builders
 */
export interface BlockManifestEntry {
	readonly directory: string;
	readonly manifest: string;
	readonly render?: string;
}

/**
 * Rich manifest record used by both PHP + TS block builders.
 *
 * @category Builders
 */
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
	readonly renderStub?: {
		readonly blockKey: string;
		readonly manifest: Record<string, unknown>;
		readonly target: {
			readonly absolutePath: string;
			readonly relativePath: string;
		};
	};
	readonly registrar: BlockRegistrarMetadata;
}

interface FileSignature {
	readonly exists: boolean;
	readonly mtimeMs?: number;
	readonly size?: number;
	readonly hash?: string;
}

interface PathSignature {
	readonly path: string;
	readonly signature: FileSignature;
}

interface BlockManifestSignature {
	readonly manifest: PathSignature;
	readonly render?: PathSignature;
}

interface BlockManifestCache {
	key: string;
	data: Map<string, ProcessedBlockManifest>;
	signatures: Map<string, BlockManifestSignature>;
}

const BLOCK_CACHE = new WeakMap<Workspace, BlockManifestCache>();
const GENERATED_BLOCKS_ROOT = path.posix.join('.generated', 'blocks');
const SURFACED_BLOCKS_ROOT = path.posix.join('src', 'blocks');

/**
 * Options for scanning the workspace for block manifests.
 *
 * @category Builders
 */
export interface CollectBlockManifestsOptions {
	readonly workspace: Workspace;
	readonly blocks: readonly IRBlock[];
}

/**
 * Collects, validates, and caches processed block manifests for later builders.
 *
 * @param    root0
 * @param    root0.workspace
 * @param    root0.blocks
 * @category Builders
 */
export async function collectBlockManifests({
	workspace,
	blocks,
}: CollectBlockManifestsOptions): Promise<Map<string, ProcessedBlockManifest>> {
	const sortedBlocks = [...blocks].sort((a, b) => a.key.localeCompare(b.key));
	const cacheKey = buildCacheKey(sortedBlocks);
	const cached = BLOCK_CACHE.get(workspace);
	if (cached && cached.key === cacheKey) {
		const valid = await isCacheValid(workspace, sortedBlocks, cached);
		if (valid) {
			return cached.data;
		}
	}

	const map = new Map<string, ProcessedBlockManifest>();
	const signatures = new Map<string, BlockManifestSignature>();

	for (const block of sortedBlocks) {
		const processed = await processBlock(workspace, block);
		map.set(block.key, processed);
		signatures.set(
			block.key,
			await buildBlockSignature(workspace, block, processed)
		);
	}

	BLOCK_CACHE.set(workspace, { key: cacheKey, data: map, signatures });
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
	const manifestLocation = await resolveBlockPath(
		workspace,
		block.manifestSource
	);
	const manifestAbsolutePath = manifestLocation.absolute;
	const manifestRelativePath = manifestLocation.relative;
	const manifestDirectory = path.dirname(manifestAbsolutePath);
	const blockDirectoryLocation = await resolveBlockPath(
		workspace,
		block.directory
	);
	const blockDirectoryAbsolute = blockDirectoryLocation.absolute;
	const blockDirectoryRelative = blockDirectoryLocation.relative;

	const manifestRead = await readManifest(workspace, {
		...block,
		manifestSource: manifestRelativePath,
	});
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

	let renderStub: ProcessedBlockManifest['renderStub'];
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
					blockKey: block.key,
					manifest: manifestRead.manifestObject ?? {},
					target: {
						absolutePath,
						relativePath,
					},
				} satisfies ProcessedBlockManifest['renderStub'];
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
			blockKey: block.key,
			manifest: manifestRead.manifestObject ?? {},
			target: {
				absolutePath: fallbackAbsolute,
				relativePath: fallbackRelative,
			},
		} satisfies ProcessedBlockManifest['renderStub'];
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

async function isCacheValid(
	workspace: Workspace,
	blocks: readonly IRBlock[],
	cache: BlockManifestCache
): Promise<boolean> {
	if (
		cache.data.size !== blocks.length ||
		cache.signatures.size !== blocks.length
	) {
		return false;
	}

	for (const block of blocks) {
		const processed = cache.data.get(block.key);
		const previousSignature = cache.signatures.get(block.key);
		if (!processed || !previousSignature) {
			return false;
		}

		const currentSignature = await buildBlockSignature(
			workspace,
			block,
			processed
		);

		if (
			!pathSignatureEqual(
				previousSignature.manifest,
				currentSignature.manifest
			)
		) {
			return false;
		}

		if (
			!pathSignatureEqual(
				previousSignature.render,
				currentSignature.render
			)
		) {
			return false;
		}
	}

	return true;
}

async function buildBlockSignature(
	workspace: Workspace,
	block: IRBlock,
	processed: ProcessedBlockManifest
): Promise<BlockManifestSignature> {
	const manifestAbsolutePath = workspace.resolve(block.manifestSource);
	const manifest: PathSignature = {
		path: manifestAbsolutePath,
		signature: await describeFile(manifestAbsolutePath),
	};

	const renderAbsolutePath = processed.renderPath?.absolutePath;
	const render = renderAbsolutePath
		? {
				path: renderAbsolutePath,
				signature: await describeFile(renderAbsolutePath),
			}
		: undefined;

	return { manifest, render } satisfies BlockManifestSignature;
}

async function describeFile(absolutePath: string): Promise<FileSignature> {
	try {
		const stats = await fs.lstat(absolutePath);
		let hash: string | undefined;

		if (stats.isFile()) {
			const contents = await fs.readFile(absolutePath);
			hash = createHash('sha1').update(contents).digest('hex');
		}

		return {
			exists: true,
			mtimeMs: stats.mtimeMs,
			size: stats.size,
			hash,
		} satisfies FileSignature;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return { exists: false } satisfies FileSignature;
		}

		throw error;
	}
}

function pathSignatureEqual(
	previous?: PathSignature,
	current?: PathSignature
): boolean {
	if (!previous && !current) {
		return true;
	}

	if (!previous || !current) {
		return false;
	}

	if (previous.path !== current.path) {
		return false;
	}

	return fileSignatureEqual(previous.signature, current.signature);
}

function fileSignatureEqual(a: FileSignature, b: FileSignature): boolean {
	if (a.exists !== b.exists) {
		return false;
	}

	if (!a.exists) {
		return true;
	}

	return a.mtimeMs === b.mtimeMs && a.size === b.size && a.hash === b.hash;
}

async function resolveBlockPath(
	workspace: Workspace,
	relativePath: string
): Promise<{ relative: string; absolute: string }> {
	const normalised = relativePath.split('\\').join('/');
	if (!normalised.startsWith(GENERATED_BLOCKS_ROOT)) {
		return {
			relative: normalised,
			absolute: workspace.resolve(normalised),
		};
	}

	const suffix = path.posix.relative(GENERATED_BLOCKS_ROOT, normalised);
	if (suffix.startsWith('..')) {
		return {
			relative: normalised,
			absolute: workspace.resolve(normalised),
		};
	}

	const surfacedRelative = path.posix.join(SURFACED_BLOCKS_ROOT, suffix);
	const surfacedAbsolute = workspace.resolve(surfacedRelative);
	if (await pathExists(surfacedAbsolute)) {
		return { relative: surfacedRelative, absolute: surfacedAbsolute };
	}

	return {
		relative: normalised,
		absolute: workspace.resolve(normalised),
	};
}

async function pathExists(absolute: string): Promise<boolean> {
	try {
		await fs.stat(absolute);
		return true;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return false;
		}

		throw error;
	}
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

function toWorkspaceRelative(workspace: Workspace, absolute: string): string {
	const relative = path.relative(workspace.root, absolute);
	if (relative === '') {
		return '.';
	}

	return relative.split(path.sep).join('/');
}
