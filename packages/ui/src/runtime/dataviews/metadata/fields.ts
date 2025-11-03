import type { Field } from '@wordpress/dataviews';

import type { DataViewMetadataIssue, MetadataPath } from './types';
import { cloneShallow, isRecord, normalizeNonEmptyString } from './primitives';
import { reportIssue } from './issues';

export function normalizeFields<TItem>(
	value: unknown,
	issues: DataViewMetadataIssue[],
	path: MetadataPath
): Field<TItem>[] | undefined {
	if (!Array.isArray(value)) {
		return reportIssue(issues, path, 'Expected an array of fields.', value);
	}

	const normalized: Field<TItem>[] = [];

	value.forEach((entry, index) => {
		if (!isRecord(entry)) {
			reportIssue(
				issues,
				[...path, index],
				'Field entries must be plain objects.',
				entry
			);
			return;
		}

		const id = normalizeNonEmptyString(
			(entry as { id?: unknown }).id,
			issues,
			[...path, index, 'id'],
			'Field id must be a non-empty string.'
		);

		if (!id) {
			return;
		}

		normalized.push(cloneShallow(entry as Field<TItem>));
	});

	if (normalized.length !== value.length) {
		return undefined;
	}

	return normalized;
}
