import type { Dirent } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Workspace } from '../../workspace';
import type { PluginDetectionResult } from './types';
import type { ScaffoldFileDescriptor } from './utils';

export function createEmptyPluginDetection(): PluginDetectionResult {
	return { detected: false, reasons: [], skipTargets: [] };
}

export function buildSkipSet({
	force,
	collisionSkips,
	pluginDetection,
}: {
	readonly force: boolean;
	readonly collisionSkips: readonly string[];
	readonly pluginDetection: PluginDetectionResult;
}): ReadonlySet<string> | undefined {
	if (force) {
		return undefined;
	}

	const skip = new Set<string>();

	for (const relativePath of collisionSkips) {
		skip.add(relativePath);
	}

	for (const relativePath of pluginDetection.skipTargets) {
		skip.add(relativePath);
	}

	return skip.size > 0 ? skip : undefined;
}

export async function detectExistingPlugin({
	workspace,
	descriptors,
}: {
	readonly workspace: Workspace;
	readonly descriptors: readonly ScaffoldFileDescriptor[];
}): Promise<PluginDetectionResult> {
	const reasons: string[] = [];
	const skipTargets = new Set<string>();

	const composerDescriptor = descriptors.find(
		(descriptor) => descriptor.relativePath === 'composer.json'
	);
	if (await composerHasAutoloadConfig(workspace, composerDescriptor)) {
		reasons.push('composer autoload entries');
	}

	const headerFiles = await findPluginHeaderFiles(workspace);
	if (headerFiles.length > 0) {
		reasons.push(`plugin header in ${formatReasonList(headerFiles)}`);
		for (const descriptor of descriptors) {
			if (descriptor.skipWhenPluginDetected) {
				skipTargets.add(descriptor.relativePath);
			}
		}
	}

	if (reasons.length === 0) {
		return createEmptyPluginDetection();
	}

	return {
		detected: true,
		reasons,
		skipTargets: Array.from(skipTargets).sort(),
	};
}

async function composerHasAutoloadConfig(
	workspace: Workspace,
	descriptor: ScaffoldFileDescriptor | undefined
): Promise<boolean> {
	if (!descriptor) {
		return false;
	}

	const contents = await workspace.readText(descriptor.relativePath);
	if (!contents) {
		return false;
	}

	try {
		const parsed = JSON.parse(contents) as Record<string, unknown>;
		return hasComposerAutoload(parsed);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return false;
		}

		throw error;
	}
}

function hasComposerAutoload(composer: Record<string, unknown>): boolean {
	return (
		hasAutoloadEntries(composer.autoload) ||
		hasAutoloadEntries(composer['autoload-dev'])
	);
}

function hasAutoloadEntries(entry: unknown): boolean {
	if (typeof entry === 'string') {
		return entry.length > 0;
	}

	if (Array.isArray(entry)) {
		return entry.length > 0;
	}

	if (typeof entry === 'object' && entry !== null) {
		const record = entry as Record<string, unknown>;
		const values = Object.values(record);
		if (values.length === 0) {
			return Object.keys(record).length > 0;
		}

		return values.some(hasAutoloadEntries);
	}

	return false;
}

async function findPluginHeaderFiles(workspace: Workspace): Promise<string[]> {
	const headerPattern = /Plugin\s+Name\s*:/i;
	const candidates = new Set<string>();

	const rootPhpFiles = await listPhpFiles(workspace, '', {
		recursive: false,
	});
	for (const relative of rootPhpFiles) {
		candidates.add(relative);
	}

	const incPhpFiles = await listPhpFiles(workspace, 'inc', {
		recursive: true,
	});
	for (const relative of incPhpFiles) {
		candidates.add(relative);
	}

	const results: string[] = [];
	for (const relative of candidates) {
		const contents = await workspace.readText(relative);
		if (contents && headerPattern.test(contents)) {
			results.push(relative);
		}
	}

	return results.sort();
}

async function listPhpFiles(
	workspace: Workspace,
	relativeDirectory: string,
	options: { recursive?: boolean } = {}
): Promise<string[]> {
	const { recursive = false } = options;
	const normalised = normaliseRelativeDirectory(relativeDirectory);
	const entries = await readDirectoryEntries(workspace, normalised);
	if (!entries) {
		return [];
	}

	const results = collectPhpFilesFromEntries(entries, normalised);
	if (!recursive) {
		return results;
	}

	const nested = await collectNestedPhpFiles(workspace, entries, normalised);
	return results.concat(nested);
}

function normaliseRelativeDirectory(relativeDirectory: string): string {
	if (
		relativeDirectory === '' ||
		relativeDirectory === '.' ||
		relativeDirectory === './'
	) {
		return '';
	}

	const trimmed = relativeDirectory
		.replace(/^[./\\]+/, '')
		.replace(/[\\/]+$/, '');
	if (trimmed === '') {
		return '';
	}

	return trimmed.split(path.sep).join('/');
}

function joinRelativePath(base: string, segment: string): string {
	const normalisedSegment = segment.split(path.sep).join('/');
	if (base === '') {
		return normalisedSegment;
	}

	return `${base}/${normalisedSegment}`;
}

function isPhpFilename(name: string): boolean {
	return name.toLowerCase().endsWith('.php');
}

async function readDirectoryEntries(
	workspace: Workspace,
	normalised: string
): Promise<Dirent[] | null> {
	const absoluteDirectory =
		normalised === ''
			? workspace.cwd()
			: workspace.resolve(...normalised.split('/'));

	try {
		return await fs.readdir(absoluteDirectory, { withFileTypes: true });
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return null;
		}

		throw error;
	}
}

function collectPhpFilesFromEntries(
	entries: readonly Dirent[],
	base: string
): string[] {
	const results: string[] = [];

	for (const entry of entries) {
		if (!entry.isFile()) {
			continue;
		}

		if (!isPhpFilename(entry.name)) {
			continue;
		}

		results.push(joinRelativePath(base, entry.name));
	}

	return results;
}

async function collectNestedPhpFiles(
	workspace: Workspace,
	entries: readonly Dirent[],
	base: string
): Promise<string[]> {
	const nestedResults: string[] = [];

	for (const entry of entries) {
		if (!entry.isDirectory()) {
			continue;
		}

		const nestedBase = joinRelativePath(base, entry.name);
		const nestedEntries = await readDirectoryEntries(workspace, nestedBase);
		if (!nestedEntries) {
			continue;
		}

		nestedResults.push(
			...collectPhpFilesFromEntries(nestedEntries, nestedBase)
		);
		nestedResults.push(
			...(await collectNestedPhpFiles(
				workspace,
				nestedEntries,
				nestedBase
			))
		);
	}

	return nestedResults;
}

function formatReasonList(values: readonly string[]): string {
	if (values.length === 0) {
		return '';
	}

	if (values.length === 1) {
		return values[0] ?? '';
	}

	const head = values.slice(0, -1).join(', ');
	const tail = values[values.length - 1] ?? '';
	return `${head} and ${tail}`;
}
