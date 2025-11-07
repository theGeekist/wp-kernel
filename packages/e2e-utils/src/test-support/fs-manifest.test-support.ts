import path from 'node:path';
import { promises as fs } from 'node:fs';
import type {
	IsolatedWorkspace,
	FileManifest,
	FileManifestDiff,
} from '../integration/types.js';
import {
	collectFileManifest,
	diffFileManifests,
} from '../integration/fs-manifest.js';

/**
 * Definition for seeding files before collecting a manifest snapshot.
 *
 * @category Test Support
 */
export type ManifestFileDefinition =
	| string
	| {
			contents: string;
			mode?: number;
	  };

/**
 * Definition for mutating files between manifest comparisons.
 *
 * @category Test Support
 */
export type ManifestMutationDefinition =
	| string
	| {
			contents?: string;
			mode?: number;
			delete?: boolean;
	  };

/**
 * Declarative configuration describing the desired manifest state.
 *
 * @category Test Support
 */
export interface ManifestStateDefinition {
	files: Record<string, ManifestFileDefinition>;
	ignore?: Array<string | RegExp>;
}

/**
 * Specification for before/after manifest comparisons.
 *
 * @category Test Support
 */
export interface ManifestComparisonDefinition {
	before: Record<string, ManifestFileDefinition>;
	after: Record<string, ManifestMutationDefinition>;
	ignore?: Array<string | RegExp>;
}

/**
 * Seed files into a workspace and collect a manifest snapshot.
 *
 * @param    workspace
 * @param    definition
 * @category Test Support
 */
export async function collectManifestState(
	workspace: IsolatedWorkspace,
	definition: ManifestStateDefinition
): Promise<FileManifest> {
	await applyFileDefinitions(workspace, definition.files);
	return collectFileManifest(workspace.root, {
		ignore: definition.ignore,
	});
}

/**
 * Apply mutations and collect before/after manifests for comparison.
 *
 * @param    workspace
 * @param    definition
 * @category Test Support
 */
export async function compareManifestStates(
	workspace: IsolatedWorkspace,
	definition: ManifestComparisonDefinition
): Promise<{
	before: FileManifest;
	after: FileManifest;
	diff: FileManifestDiff;
}> {
	await applyFileDefinitions(workspace, definition.before);
	const before = await collectFileManifest(workspace.root, {
		ignore: definition.ignore,
	});

	await applyMutationDefinitions(workspace, definition.after);
	const after = await collectFileManifest(workspace.root, {
		ignore: definition.ignore,
	});

	return {
		before,
		after,
		diff: diffFileManifests(before, after),
	};
}

async function applyFileDefinitions(
	workspace: IsolatedWorkspace,
	files: Record<string, ManifestFileDefinition>
): Promise<void> {
	await Promise.all(
		Object.entries(files).map(async ([relativePath, definition]) => {
			const absolute = path.join(workspace.root, relativePath);
			await fs.mkdir(path.dirname(absolute), { recursive: true });
			const { contents, mode } = normaliseFileDefinition(definition);
			await fs.writeFile(absolute, contents, 'utf8');
			if (typeof mode === 'number') {
				await fs.chmod(absolute, mode);
			}
		})
	);
}

async function applyMutationDefinitions(
	workspace: IsolatedWorkspace,
	files: Record<string, ManifestMutationDefinition>
): Promise<void> {
	await Promise.all(
		Object.entries(files).map(async ([relativePath, definition]) => {
			const absolute = path.join(workspace.root, relativePath);
			if (shouldDelete(definition)) {
				await fs.rm(absolute, { force: true });
				return;
			}

			await fs.mkdir(path.dirname(absolute), { recursive: true });
			const { contents, mode } = normaliseMutationDefinition(definition);
			if (typeof contents === 'string') {
				await fs.writeFile(absolute, contents, 'utf8');
			}
			if (typeof mode === 'number') {
				await fs.chmod(absolute, mode);
			}
		})
	);
}

function normaliseFileDefinition(definition: ManifestFileDefinition): {
	contents: string;
	mode?: number;
} {
	if (typeof definition === 'string') {
		return { contents: definition };
	}

	return definition;
}

function normaliseMutationDefinition(definition: ManifestMutationDefinition): {
	contents?: string;
	mode?: number;
} {
	if (typeof definition === 'string') {
		return { contents: definition };
	}

	return definition;
}

function shouldDelete(definition: ManifestMutationDefinition): boolean {
	if (typeof definition === 'string') {
		return false;
	}

	return definition.delete === true;
}
