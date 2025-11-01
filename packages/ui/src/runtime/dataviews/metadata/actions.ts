import type { ResourceDataViewActionConfig } from '../../../dataviews/types';
import type { DataViewMetadataIssue, MetadataPath } from './types';
import { cloneShallow, isRecord, normalizeNonEmptyString } from './primitives';
import { reportIssue } from './issues';

export function normalizeActions<TItem>(
	value: unknown,
	issues: DataViewMetadataIssue[],
	path: MetadataPath
): ResourceDataViewActionConfig<TItem, unknown, unknown>[] | undefined {
	if (!Array.isArray(value)) {
		return reportIssue(
			issues,
			path,
			'Actions must be provided as an array.',
			value
		);
	}

	const normalized: ResourceDataViewActionConfig<TItem, unknown, unknown>[] =
		[];

	value.forEach((entry, index) => {
		if (!isRecord(entry)) {
			reportIssue(
				issues,
				[...path, index],
				'Action definitions must be objects.',
				entry
			);
			return;
		}

		const id = normalizeNonEmptyString(
			(entry as { id?: unknown }).id,
			issues,
			[...path, index, 'id'],
			'Action id must be a non-empty string.'
		);

		if (!id) {
			return;
		}

		normalized.push(
			cloneShallow(
				entry as unknown as ResourceDataViewActionConfig<
					TItem,
					unknown,
					unknown
				>
			)
		);
	});

	if (normalized.length !== value.length) {
		return undefined;
	}

	return normalized;
}
