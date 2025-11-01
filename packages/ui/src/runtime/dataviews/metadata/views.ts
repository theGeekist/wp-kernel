import type { View } from '@wordpress/dataviews';

import type { ResourceDataViewSavedView } from '../../../dataviews/types';
import type { DataViewMetadataIssue, MetadataPath } from './types';
import {
	applyOptional,
	cloneShallow,
	isRecord,
	normalizeBoolean,
	normalizeNonEmptyString,
} from './primitives';
import { reportIssue } from './issues';

export function normalizeView(
	value: unknown,
	issues: DataViewMetadataIssue[],
	path: MetadataPath
): View | undefined {
	if (!isRecord(value)) {
		return reportIssue(
			issues,
			path,
			'View definition must be an object.',
			value
		);
	}

	const type = normalizeNonEmptyString(
		(value as { type?: unknown }).type,
		issues,
		[...path, 'type'],
		'View type must be a non-empty string.'
	);

	if (!type) {
		return undefined;
	}

	return cloneShallow(value as unknown as View);
}

function buildSavedView(
	entry: unknown,
	issues: DataViewMetadataIssue[],
	path: MetadataPath
): ResourceDataViewSavedView | undefined {
	if (!isRecord(entry)) {
		reportIssue(issues, path, 'Saved view entries must be objects.', entry);
		return undefined;
	}

	const id = normalizeNonEmptyString(
		(entry as { id?: unknown }).id,
		issues,
		[...path, 'id'],
		'Saved view id must be a non-empty string.'
	);
	const label = normalizeNonEmptyString(
		(entry as { label?: unknown }).label,
		issues,
		[...path, 'label'],
		'Saved view label must be a non-empty string.'
	);
	const view = normalizeView(
		(entry as Record<string, unknown>).view,
		issues,
		[...path, 'view']
	);

	if (!id || !label || !view) {
		return undefined;
	}

	const savedView: ResourceDataViewSavedView = {
		id,
		label,
		view,
	};

	const optionalAssignments: Array<{
		key: string;
		normalize: (
			value: unknown,
			fieldPath: MetadataPath
		) => string | boolean | undefined;
		assign: (value: string | boolean) => void;
	}> = [
		{
			key: 'description',
			normalize: (value, fieldPath) =>
				normalizeNonEmptyString(
					value,
					issues,
					fieldPath,
					'Saved view description must be a non-empty string when provided.'
				),
			assign: (description) => {
				savedView.description = description as string;
			},
		},
		{
			key: 'isDefault',
			normalize: (value, fieldPath) =>
				normalizeBoolean(
					value,
					issues,
					fieldPath,
					'Saved view isDefault must be a boolean when provided.'
				),
			assign: (isDefault) => {
				savedView.isDefault = isDefault as boolean;
			},
		},
	];

	for (const { key, normalize, assign } of optionalAssignments) {
		if (
			!applyOptional(
				entry as Record<string, unknown>,
				key,
				path,
				normalize,
				assign
			)
		) {
			return undefined;
		}
	}

	for (const [key, extra] of Object.entries(entry)) {
		if (['id', 'label', 'view', 'description', 'isDefault'].includes(key)) {
			continue;
		}

		(savedView as Record<string, unknown>)[key] = extra;
	}

	return savedView;
}

export function normalizeSavedViews(
	value: unknown,
	issues: DataViewMetadataIssue[],
	path: MetadataPath
): ResourceDataViewSavedView[] | undefined {
	if (!Array.isArray(value)) {
		return reportIssue(
			issues,
			path,
			'Saved views must be provided as an array.',
			value
		);
	}

	const views: ResourceDataViewSavedView[] = [];

	value.forEach((entry, index) => {
		const savedView = buildSavedView(entry, issues, [...path, index]);

		if (!savedView) {
			return;
		}

		views.push(savedView);
	});

	if (views.length !== value.length) {
		return undefined;
	}

	return views;
}
