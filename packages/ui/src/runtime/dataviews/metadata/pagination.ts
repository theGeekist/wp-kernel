import type { DataViewMetadataIssue, MetadataPath } from './types';
import { cloneShallow, isNonEmptyString, isRecord } from './primitives';
import { reportIssue } from './issues';

export function normalizePerPageSizes(
	value: unknown,
	issues: DataViewMetadataIssue[],
	path: MetadataPath
): number[] | undefined {
	if (!Array.isArray(value)) {
		return reportIssue(
			issues,
			path,
			'perPageSizes must be an array of numbers.',
			value
		);
	}

	const normalized: number[] = [];
	let valid = true;

	value.forEach((entry, index) => {
		const size = Number(entry);

		if (!Number.isFinite(size) || size <= 0) {
			reportIssue(
				issues,
				[...path, index],
				'perPageSizes entries must be positive numbers.',
				entry
			);
			valid = false;
			return;
		}

		normalized.push(size);
	});

	if (!valid) {
		return undefined;
	}

	return normalized;
}

export function normalizeDefaultLayouts(
	value: unknown,
	issues: DataViewMetadataIssue[],
	path: MetadataPath
): Record<string, unknown> | undefined {
	if (!isRecord(value)) {
		return reportIssue(
			issues,
			path,
			'defaultLayouts must be an object.',
			value
		);
	}

	const normalized: Record<string, unknown> = {};

	for (const [layoutKey, layoutValue] of Object.entries(value)) {
		if (!isNonEmptyString(layoutKey)) {
			reportIssue(
				issues,
				[...path, layoutKey],
				'Layout keys must be non-empty strings.',
				layoutKey
			);
			return undefined;
		}

		if (
			layoutValue !== undefined &&
			layoutValue !== null &&
			!isRecord(layoutValue)
		) {
			reportIssue(
				issues,
				[...path, layoutKey],
				'Layout definitions must be plain objects when provided.',
				layoutValue
			);
			return undefined;
		}

		normalized[layoutKey] = cloneShallow(
			layoutValue as Record<string, unknown>
		);
	}

	return normalized;
}
