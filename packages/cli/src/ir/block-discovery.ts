import path from 'node:path';
import fs from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import { KernelError } from '@geekist/wp-kernel';
import type { IRBlock } from './types';
import { toWorkspaceRelative } from '../utils';

const IGNORED_DIRECTORIES = new Set(['node_modules', '.generated', '.git']);

interface BlockDiscoveryState {
	queue: string[];
	blocks: IRBlock[];
	seenKeys: Map<string, string>;
	workspaceRoot: string;
}

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

function isOutsideWorkspace(workspaceRoot: string, candidate: string): boolean {
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
	const block = await loadBlockEntry(manifestPath, options.directory);

	const existing = options.state.seenKeys.get(block.key);
	if (existing && existing !== block.directory) {
		throw new KernelError('ValidationError', {
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

function shouldSkipEntry(entry: Dirent): boolean {
	if (entry.isSymbolicLink()) {
		return true;
	}

	if (!entry.isDirectory()) {
		return true;
	}

	return IGNORED_DIRECTORIES.has(entry.name);
}

async function loadBlockEntry(
	manifestPath: string,
	directory: string
): Promise<IRBlock> {
	let raw: string;
	try {
		raw = await fs.readFile(manifestPath, 'utf8');
	} catch (error) {
		throw new KernelError('ValidationError', {
			message: `Failed to read block manifest at ${manifestPath}.`,
			data: error instanceof Error ? { originalError: error } : undefined,
		});
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch (error) {
		throw new KernelError('ValidationError', {
			message: `Invalid JSON in block manifest ${manifestPath}.`,
			data: error instanceof Error ? { originalError: error } : undefined,
		});
	}

	if (!parsed || typeof parsed !== 'object') {
		throw new KernelError('ValidationError', {
			message: `Block manifest ${manifestPath} must be an object.`,
		});
	}

	const key = (parsed as Record<string, unknown>).name;
	if (typeof key !== 'string' || !key) {
		throw new KernelError('ValidationError', {
			message: `Block manifest ${manifestPath} missing required "name" field.`,
		});
	}

	const hasRender = Boolean(
		typeof (parsed as Record<string, unknown>).render === 'string' ||
			(await fileExists(path.join(directory, 'render.php')))
	);

	return {
		key,
		directory: toWorkspaceRelative(directory),
		hasRender,
		manifestSource: toWorkspaceRelative(manifestPath),
	};
}

async function fileExists(candidate: string): Promise<boolean> {
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
