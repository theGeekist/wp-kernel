import path from 'node:path';
import type { Workspace } from '../../workspace';
import type { ReporterInstance } from './types';

interface CleanupOptions {
	readonly workspace: Workspace;
	readonly reporter: ReporterInstance;
	readonly targets: readonly string[];
}

interface CleanupResult {
	readonly removed: string[];
	readonly missing: string[];
	readonly rejected: string[];
}

export async function cleanupWorkspaceTargets({
	workspace,
	reporter,
	targets,
}: CleanupOptions): Promise<CleanupResult> {
	const removed: string[] = [];
	const missing: string[] = [];
	const rejected: string[] = [];
	const processed = new Set<string>();

	for (const target of targets) {
		const normalisedTarget = normaliseCleanupTarget(target);
		if (!normalisedTarget) {
			rejected.push(target);
			continue;
		}

		if (processed.has(normalisedTarget)) {
			continue;
		}

		processed.add(normalisedTarget);

		const exists = await workspace.exists(normalisedTarget);
		if (!exists) {
			missing.push(normalisedTarget);
			continue;
		}

		await workspace.rm(normalisedTarget);
		removed.push(normalisedTarget);
	}

	if (removed.length > 0) {
		reporter.info('wpk apply cleanup: removed leftover targets.', {
			files: removed,
		});
	}

	if (missing.length > 0) {
		reporter.info('wpk apply cleanup: targets already absent.', {
			files: missing,
		});
	}

	if (rejected.length > 0) {
		reporter.warn('wpk apply cleanup: rejected unsafe cleanup targets.', {
			files: rejected,
		});
	}

	return { removed, missing, rejected } satisfies CleanupResult;
}

function normaliseCleanupTarget(target: string): string | null {
	if (!target) {
		return null;
	}

	const replaced = target.replace(/\\/g, '/');
	const normalised = path.posix.normalize(replaced);
	if (!normalised || normalised === '.' || normalised.startsWith('../')) {
		return null;
	}

	return normalised.replace(/^\.\//, '').replace(/^\/+/, '');
}
