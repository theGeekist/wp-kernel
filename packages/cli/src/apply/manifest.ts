import path from 'node:path';
import { WPKernelError } from '@wpkernel/core/error';
import type { IRv1 } from '../ir/publicTypes';
import { toPascalCase } from '../builders/php/utils';
import type { Workspace } from '../workspace';

export const GENERATION_STATE_VERSION = 1 as const;
export const GENERATION_STATE_PATH = path.posix.join(
	'.wpk',
	'apply',
	'state.json'
);

export interface GenerationManifestFilePair {
	readonly file: string;
	readonly ast: string;
}

export interface GenerationManifestResourceArtifacts {
	readonly generated: readonly string[];
	readonly shims: readonly string[];
}

export interface GenerationManifestResourceEntry {
	readonly hash: string;
	readonly artifacts: GenerationManifestResourceArtifacts;
}

/**
 * Represents the manifest of generated files and resources.
 * @public
 */
export interface GenerationManifest {
	readonly version: typeof GENERATION_STATE_VERSION;
	readonly resources: Record<string, GenerationManifestResourceEntry>;
	readonly pluginLoader?: GenerationManifestFilePair;
	readonly phpIndex?: GenerationManifestFilePair;
}

export interface RemovedResourceEntry {
	readonly resource: string;
	readonly generated: readonly string[];
	readonly shims: readonly string[];
}

export interface GenerationManifestDiff {
	readonly removed: readonly RemovedResourceEntry[];
}

export function buildEmptyGenerationState(): GenerationManifest {
	return {
		version: GENERATION_STATE_VERSION,
		resources: {},
	} satisfies GenerationManifest;
}

export async function readGenerationState(
	workspace: Workspace
): Promise<GenerationManifest> {
	const contents = await workspace.readText(GENERATION_STATE_PATH);
	if (!contents) {
		return buildEmptyGenerationState();
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(contents) as unknown;
	} catch (error) {
		throw new WPKernelError('DeveloperError', {
			message: 'Failed to parse generation state JSON.',
			context: {
				file: GENERATION_STATE_PATH,
				error: (error as Error).message,
			},
		});
	}

	return normaliseGenerationState(parsed);
}

export async function writeGenerationState(
	workspace: Workspace,
	state: GenerationManifest
): Promise<void> {
	await workspace.writeJson(GENERATION_STATE_PATH, state, { pretty: true });
}

export function buildGenerationManifestFromIr(
	ir: IRv1 | null
): GenerationManifest {
	if (!ir) {
		return buildEmptyGenerationState();
	}

	const resources = buildResourceEntries(ir);
	const pluginLoader = buildFilePair('plugin.php');
	const phpIndex = buildFilePair(
		path.posix.join(normaliseDirectory(ir.php.outputDir), 'index.php')
	);

	return {
		version: GENERATION_STATE_VERSION,
		resources,
		...(pluginLoader ? { pluginLoader } : {}),
		...(phpIndex ? { phpIndex } : {}),
	} satisfies GenerationManifest;
}

export function diffGenerationState(
	previous: GenerationManifest,
	next: GenerationManifest
): GenerationManifestDiff {
	const removed: RemovedResourceEntry[] = [];

	for (const [resource, entry] of Object.entries(previous.resources)) {
		const nextEntry = next.resources[resource];

		if (!nextEntry) {
			removed.push({
				resource,
				generated: [...entry.artifacts.generated],
				shims: [...entry.artifacts.shims],
			});
			continue;
		}

		const nextGenerated = new Set(nextEntry.artifacts.generated);
		const nextShims = new Set(nextEntry.artifacts.shims);

		const removedGenerated = entry.artifacts.generated.filter(
			(file) => !nextGenerated.has(file)
		);
		const removedShims = entry.artifacts.shims.filter(
			(file) => !nextShims.has(file)
		);

		if (removedGenerated.length === 0 && removedShims.length === 0) {
			continue;
		}

		removed.push({
			resource,
			generated: removedGenerated,
			shims: removedShims,
		});
	}

	return { removed } satisfies GenerationManifestDiff;
}

export function normaliseGenerationState(value: unknown): GenerationManifest {
	if (!isRecord(value)) {
		return buildEmptyGenerationState();
	}

	if (value.version !== GENERATION_STATE_VERSION) {
		return buildEmptyGenerationState();
	}

	const resources = normaliseResources(value.resources);
	const pluginLoader = normaliseFilePair(value.pluginLoader);
	const phpIndex = normaliseFilePair(value.phpIndex);

	return {
		version: GENERATION_STATE_VERSION,
		resources,
		...(pluginLoader ? { pluginLoader } : {}),
		...(phpIndex ? { phpIndex } : {}),
	} satisfies GenerationManifest;
}

function normaliseResources(
	value: unknown
): Record<string, GenerationManifestResourceEntry> {
	if (!isRecord(value)) {
		return {};
	}

	const entries: Record<string, GenerationManifestResourceEntry> = {};
	for (const [key, entry] of Object.entries(value)) {
		if (!key) {
			continue;
		}

		const normalised = normaliseResourceEntry(entry);
		if (!normalised) {
			continue;
		}

		entries[key] = normalised;
	}

	return entries;
}

function buildResourceEntries(
	ir: IRv1
): Record<string, GenerationManifestResourceEntry> {
	const entries: Record<string, GenerationManifestResourceEntry> = {};
	const autoloadRoot = normaliseDirectory(ir.php.autoload);
	const outputDir = normaliseDirectory(ir.php.outputDir);

	for (const resource of ir.resources) {
		const pascal = toPascalCase(resource.name);
		if (!pascal) {
			continue;
		}

		const controllerFile = path.posix.join(
			outputDir,
			'Rest',
			`${pascal}Controller.php`
		);

		const generatedArtifacts = Array.from(
			new Set([controllerFile, `${controllerFile}.ast.json`])
		);

		const shimBase = path.posix.join('Rest', `${pascal}Controller.php`);
		const shimRoot = autoloadRoot ? autoloadRoot : '';
		const shimPath = shimRoot
			? path.posix.join(shimRoot, shimBase)
			: shimBase;

		entries[resource.name] = {
			hash: resource.hash,
			artifacts: {
				generated: generatedArtifacts,
				shims: [shimPath],
			},
		} satisfies GenerationManifestResourceEntry;
	}

	return entries;
}

function buildFilePair(file: string): GenerationManifestFilePair | null {
	const normalised = normaliseFilePath(file);
	if (!normalised) {
		return null;
	}

	return {
		file: normalised,
		ast: `${normalised}.ast.json`,
	} satisfies GenerationManifestFilePair;
}

function normaliseDirectory(directory: string): string {
	const normalised = normaliseFilePath(directory);
	return normalised || '';
}

function normaliseResourceEntry(
	value: unknown
): GenerationManifestResourceEntry | null {
	if (!isRecord(value)) {
		return null;
	}

	const hash = typeof value.hash === 'string' ? value.hash : null;
	if (!hash) {
		return null;
	}

	const artifacts = normaliseResourceArtifacts(value.artifacts);
	if (!artifacts) {
		return null;
	}

	return { hash, artifacts } satisfies GenerationManifestResourceEntry;
}

function normaliseResourceArtifacts(
	value: unknown
): GenerationManifestResourceArtifacts | null {
	if (!isRecord(value)) {
		return null;
	}

	const generated = normaliseFileList(value.generated);
	if (generated.length === 0) {
		return null;
	}

	const shims = normaliseFileList(value.shims);

	return {
		generated,
		shims,
	} satisfies GenerationManifestResourceArtifacts;
}

function normaliseFilePair(value: unknown): GenerationManifestFilePair | null {
	if (!isRecord(value)) {
		return null;
	}

	const file =
		typeof value.file === 'string' ? normaliseFilePath(value.file) : '';
	const ast =
		typeof value.ast === 'string' ? normaliseFilePath(value.ast) : '';

	if (!file || !ast) {
		return null;
	}

	return { file, ast } satisfies GenerationManifestFilePair;
}

function normaliseFileList(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}

	const results: string[] = [];
	const seen = new Set<string>();

	for (const entry of value) {
		if (typeof entry !== 'string') {
			continue;
		}

		const normalised = normaliseFilePath(entry);
		if (!normalised || seen.has(normalised)) {
			continue;
		}

		seen.add(normalised);
		results.push(normalised);
	}

	return results;
}

function normaliseFilePath(file: string): string {
	const replaced = file.replace(/\\/g, '/');
	const normalised = path.posix.normalize(replaced);

	if (normalised === '.' || normalised === '') {
		return '';
	}

	return normalised.replace(/^\.\/+/u, '').replace(/^\/+/, '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
