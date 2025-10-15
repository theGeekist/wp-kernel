import type {
	FileManifest,
	GoldenDiffSummary,
	GoldenSnapshot,
	CliTranscript,
	BundleInspectionResult,
} from './types.js';
import { diffFileManifests } from './fs-manifest.js';

interface CreateSnapshotOptions {
	manifest: FileManifest;
	bundle?: BundleInspectionResult;
	transcripts?: CliTranscript[];
	metadata?: Record<string, unknown>;
}

export function createGoldenSnapshot(
	options: CreateSnapshotOptions
): GoldenSnapshot {
	return {
		manifest: options.manifest,
		bundle: options.bundle,
		transcripts: options.transcripts ?? [],
		metadata: options.metadata,
		version: 1,
	};
}

export function diffGoldenSnapshots(
	previous: GoldenSnapshot,
	next: GoldenSnapshot
): GoldenDiffSummary {
	const manifestDiff = diffFileManifests(previous.manifest, next.manifest);
	const metadataChanges = diffMetadata(
		previous.metadata ?? {},
		next.metadata ?? {}
	);

	return {
		added: manifestDiff.added,
		removed: manifestDiff.removed,
		changed: manifestDiff.changed,
		metadataChanges:
			Object.keys(metadataChanges).length > 0
				? metadataChanges
				: undefined,
	};
}

function diffMetadata(
	previous: Record<string, unknown>,
	next: Record<string, unknown>
): Record<string, { previous: unknown; next: unknown }> {
	const changes: Record<string, { previous: unknown; next: unknown }> = {};
	const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
	for (const key of keys) {
		if (previous[key] !== next[key]) {
			changes[key] = {
				previous: previous[key],
				next: next[key],
			};
		}
	}
	return changes;
}
