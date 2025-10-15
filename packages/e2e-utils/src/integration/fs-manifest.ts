import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { FileHashEntry, FileManifest, FileManifestDiff } from './types.js';

interface ManifestOptions {
	ignore?: Array<string | RegExp>;
}

export async function collectFileManifest(
	root: string,
	options: ManifestOptions = {}
): Promise<FileManifest> {
	const files: Record<string, FileHashEntry> = {};
	const ignore = options.ignore ?? [];

	await walk(root, async (filePath) => {
		const relative = path.relative(root, filePath);
		if (shouldIgnore(relative, ignore)) {
			return;
		}

		const stat = await fs.stat(filePath);
		if (!stat.isFile()) {
			return;
		}

		const hash = await hashFile(filePath);
		files[relative] = {
			hash,
			size: stat.size,
			mode: stat.mode,
		};
	});

	const orderedEntries = Object.entries(files).sort(([a], [b]) =>
		a.localeCompare(b)
	);

	return {
		generatedAt: new Date().toISOString(),
		files: Object.fromEntries(orderedEntries),
	};
}

export function diffFileManifests(
	previous: FileManifest,
	next: FileManifest
): FileManifestDiff {
	const previousFiles = previous.files;
	const nextFiles = next.files;

	const added: string[] = [];
	const removed: string[] = [];
	const changed: string[] = [];

	for (const key of Object.keys(previousFiles)) {
		if (!(key in nextFiles)) {
			removed.push(key);
		}
	}

	for (const [key, entry] of Object.entries(nextFiles)) {
		const prior = previousFiles[key];
		if (!prior) {
			added.push(key);
			continue;
		}

		if (
			prior.hash !== entry.hash ||
			prior.mode !== entry.mode ||
			prior.size !== entry.size
		) {
			changed.push(key);
		}
	}

	return { added, removed, changed };
}

function shouldIgnore(
	relative: string,
	ignore: Array<string | RegExp>
): boolean {
	return ignore.some((pattern) => {
		if (typeof pattern === 'string') {
			return relative.startsWith(pattern);
		}

		return pattern.test(relative);
	});
}

async function walk(
	directory: string,
	visitor: (file: string) => Promise<void>
): Promise<void> {
	const entries = await fs.readdir(directory, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			await walk(fullPath, visitor);
		} else {
			await visitor(fullPath);
		}
	}
}

async function hashFile(filePath: string): Promise<string> {
	const file = await fs.readFile(filePath);
	return crypto.createHash('sha256').update(file).digest('hex');
}
