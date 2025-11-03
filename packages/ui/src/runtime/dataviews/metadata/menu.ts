import type { ResourceDataViewMenuConfig } from '../../../dataviews/types';
import type { DataViewMetadataIssue, MetadataPath } from './types';
import {
	applyOptional,
	isRecord,
	normalizeNonEmptyString,
	normalizeNumber,
} from './primitives';
import { reportIssue } from './issues';

export function normalizeMenu(
	value: unknown,
	issues: DataViewMetadataIssue[],
	path: MetadataPath
): ResourceDataViewMenuConfig | undefined {
	if (!isRecord(value)) {
		return reportIssue(
			issues,
			path,
			'Menu configuration must be an object.',
			value
		);
	}

	const slug = normalizeNonEmptyString(
		(value as { slug?: unknown }).slug,
		issues,
		[...path, 'slug'],
		'Menu slug must be a non-empty string.'
	);
	const title = normalizeNonEmptyString(
		(value as { title?: unknown }).title,
		issues,
		[...path, 'title'],
		'Menu title must be a non-empty string.'
	);

	if (!slug || !title) {
		return undefined;
	}

	const menu: ResourceDataViewMenuConfig = { slug, title };
	const optionalAssignments: Array<{
		key: string;
		normalize: (
			candidate: unknown,
			fieldPath: MetadataPath
		) => string | number | undefined;
		assign: (value: string | number) => void;
	}> = [
		{
			key: 'capability',
			normalize: (candidate, fieldPath) =>
				normalizeNonEmptyString(
					candidate,
					issues,
					fieldPath,
					'Menu capability must be a non-empty string when provided.'
				),
			assign: (capability) => {
				menu.capability = capability as string;
			},
		},
		{
			key: 'parent',
			normalize: (candidate, fieldPath) =>
				normalizeNonEmptyString(
					candidate,
					issues,
					fieldPath,
					'Menu parent must be a non-empty string when provided.'
				),
			assign: (parent) => {
				menu.parent = parent as string;
			},
		},
		{
			key: 'position',
			normalize: (candidate, fieldPath) =>
				normalizeNumber(
					candidate,
					issues,
					fieldPath,
					'Menu position must be a number when provided.'
				),
			assign: (position) => {
				menu.position = position as number;
			},
		},
	];

	for (const { key, normalize, assign } of optionalAssignments) {
		if (
			!applyOptional(
				value as Record<string, unknown>,
				key,
				path,
				normalize,
				assign
			)
		) {
			return undefined;
		}
	}

	for (const [extraKey, extra] of Object.entries(value)) {
		if (
			['slug', 'title', 'capability', 'parent', 'position'].includes(
				extraKey
			)
		) {
			continue;
		}

		(menu as Record<string, unknown>)[extraKey] = extra;
	}

	return menu;
}
