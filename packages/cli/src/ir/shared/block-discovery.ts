import path from 'node:path';
import fs from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import { WPKernelError } from '@wpkernel/core/error';
import type { IRBlock } from '../publicTypes';
import { createBlockHash, createBlockId } from './identity';

const IGNORED_DIRECTORIES = new Set([
	'node_modules',
	'.generated',
	'.git',
	'.wpk',
]);

interface BlockDiscoveryState {
	queue: string[];
	blocks: IRBlock[];
	seenKeys: Map<string, string>;
	workspaceRoot: string;
}

/**
 * Recursively discover blocks in the given workspace by locating block.json
 * manifests.
 *
 * This walks the workspace tree (skipping ignored directories), finds
 * directories that contain a `block.json` manifest, validates and loads the
 * manifest, and returns a sorted list of discovered IRBlock entries.
 *
 * @param    workspaceRoot - Filesystem path to the workspace root to search
 * @returns Discovered IRBlock entries
 * @category IR
 */
export async function discoverBlocks(
	workspaceRoot: string
): Promise<IRBlock[]> {
	const state = createBlockDiscoveryState(workspaceRoot);

	while (state.queue.length > 0) {
		const current = state.queue.pop()!;
		if (isOutsideWorkspace(state.workspaceRoot, current)) {
			continue;
		}

		const entries = await fs.readdir(current, { withFileTypes: true });
		const manifestEntry = findManifest(entries);

		if (manifestEntry) {
			await handleBlockDirectory({
				state,
				directory: current,
				manifestEntry,
			});
			continue;
		}

		enqueueChildDirectories({ state, directory: current, entries });
	}

	state.blocks.sort((a, b) => a.key.localeCompare(b.key));

	return state.blocks;
}

function createBlockDiscoveryState(workspaceRoot: string): BlockDiscoveryState {
	return {
		queue: [workspaceRoot],
		blocks: [],
		seenKeys: new Map<string, string>(),
		workspaceRoot,
	};
}

/**
 * Return true when the candidate path is outside the provided workspace
 * root.
 *
 * Used by the discovery walker to avoid traversing outside the declared
 * workspace boundary.
 *
 * @param    workspaceRoot - Workspace root directory
 * @param    candidate     - Path to test
 * @returns True if candidate is outside workspaceRoot
 * @category IR
 */
export function isOutsideWorkspace(
	workspaceRoot: string,
	candidate: string
): boolean {
	const relative = path.relative(workspaceRoot, candidate);
	return relative.startsWith('..');
}

function findManifest(entries: Dirent[]): Dirent | undefined {
	return entries.find(
		(entry) => entry.isFile() && entry.name === 'block.json'
	);
}

async function handleBlockDirectory(options: {
	state: BlockDiscoveryState;
	directory: string;
	manifestEntry: Dirent;
}): Promise<void> {
	const manifestPath = path.join(
		options.directory,
		options.manifestEntry.name
	);
	const block = await loadBlockEntry(
		manifestPath,
		options.directory,
		options.state.workspaceRoot
	);

	const existing = options.state.seenKeys.get(block.key);
	if (existing && existing !== block.directory) {
		throw new WPKernelError('ValidationError', {
			message: `Block "${block.key}" discovered in multiple directories.`,
			context: { existing, duplicate: block.directory },
		});
	}

	options.state.seenKeys.set(block.key, block.directory);
	options.state.blocks.push(block);
}

function enqueueChildDirectories(options: {
	state: BlockDiscoveryState;
	directory: string;
	entries: Dirent[];
}): void {
	for (const entry of options.entries) {
		if (shouldSkipEntry(entry)) {
			continue;
		}

		options.state.queue.push(path.join(options.directory, entry.name));
	}
}

/**
 * Return true when a directory entry should be skipped during discovery.
 *
 * This excludes non-directories, symbolic links and well-known ignored
 * directories such as node_modules or generated build output.
 *
 * @param    entry - Directory entry to test
 * @returns True when the entry should be skipped
 * @category IR
 */
export function shouldSkipEntry(entry: Dirent): boolean {
	if (entry.isSymbolicLink()) {
		return true;
	}

	if (!entry.isDirectory()) {
		return true;
	}

	return IGNORED_DIRECTORIES.has(entry.name);
}

/**
 * Load and validate a block manifest at the provided path, returning an
 * IRBlock record.
 *
 * Reads the manifest JSON, validates required fields, resolves whether a
 * render file exists, and converts absolute paths to workspace-relative
 * values used by the IR.
 *
 * @param    manifestPath  - Absolute path to block.json
 * @param    directory     - Directory containing the block
 * @param    workspaceRoot - Workspace root used for relative paths
 * @returns IRBlock describing the discovered block
 * @category IR
 */
export async function loadBlockEntry(
	manifestPath: string,
	directory: string,
	workspaceRoot: string
): Promise<IRBlock> {
	let raw: string;
	try {
		raw = await fs.readFile(manifestPath, 'utf8');
	} catch (error) {
		throw new WPKernelError('ValidationError', {
			message: `Failed to read block manifest at ${manifestPath}.`,
			data: error instanceof Error ? { originalError: error } : undefined,
		});
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch (error) {
		throw new WPKernelError('ValidationError', {
			message: `Invalid JSON in block manifest ${manifestPath}.`,
			data: error instanceof Error ? { originalError: error } : undefined,
		});
	}

	if (!parsed || typeof parsed !== 'object') {
		throw new WPKernelError('ValidationError', {
			message: `Block manifest ${manifestPath} must be an object.`,
		});
	}

	const key = (parsed as Record<string, unknown>).name;
	if (typeof key !== 'string' || !key) {
		throw new WPKernelError('ValidationError', {
			message: `Block manifest ${manifestPath} missing required "name" field.`,
		});
	}

	const hasRender = Boolean(
		typeof (parsed as Record<string, unknown>).render === 'string' ||
			(await fileExists(path.join(directory, 'render.php')))
	);

	const relativeDirectory = path.relative(workspaceRoot, directory);
	const relativeManifestPath = path.relative(workspaceRoot, manifestPath);

	return {
		id: createBlockId({
			key,
			directory: relativeDirectory,
			manifestSource: relativeManifestPath,
		}),
		key,
		directory: relativeDirectory,
		hasRender,
		manifestSource: relativeManifestPath,
		hash: createBlockHash({
			key,
			directory: relativeDirectory,
			hasRender,
			manifestSource: relativeManifestPath,
		}),
	};
}

/**
 * Check whether a file exists and is a regular file.
 *
 * Returns `false` for non-existent files, and re-throws unexpected errors.
 *
 * @param    candidate - Path to check
 * @returns True if the candidate exists and is a file
 * @category IR
 */
export async function fileExists(candidate: string): Promise<boolean> {
	try {
		const stat = await fs.stat(candidate);
		return stat.isFile();
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return false;
		}

		throw error;
	}
}
