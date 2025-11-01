import type {
	ResourceDataViewConfig,
	ResourceDataViewSavedView,
	ResourceDataViewScreenConfig,
} from '../../../dataviews/types';
import type { DataViewMetadataIssue, MetadataPath } from './types';
import {
	applyOptional,
	normalizeBoolean,
	normalizeFunctionValue,
	normalizeNonEmptyString,
} from './primitives';
import { reportIssue } from './issues';
import { normalizeFields } from './fields';
import { normalizeView, normalizeSavedViews } from './views';
import { normalizeActions } from './actions';
import { normalizePerPageSizes, normalizeDefaultLayouts } from './pagination';
import { normalizeScreen } from './screen';

export function buildConfig<TItem, TQuery>(
	metadata: Record<string, unknown>,
	issues: DataViewMetadataIssue[],
	path: MetadataPath
): ResourceDataViewConfig<TItem, TQuery> | undefined {
	const fields = normalizeFields<TItem>(metadata.fields, issues, [
		...path,
		'fields',
	]);
	const defaultView = normalizeView(metadata.defaultView, issues, [
		...path,
		'defaultView',
	]);
	const mapQuery = metadata.mapQuery;

	if (typeof mapQuery !== 'function') {
		reportIssue(
			issues,
			[...path, 'mapQuery'],
			'mapQuery must be a function.',
			mapQuery
		);
	}

	if (!fields || !defaultView || typeof mapQuery !== 'function') {
		return undefined;
	}

	const config: ResourceDataViewConfig<TItem, TQuery> = {
		fields,
		defaultView,
		mapQuery: mapQuery as ResourceDataViewConfig<TItem, TQuery>['mapQuery'],
	};

	const optionalAssignments: Array<{
		key: string;
		normalize: (
			value: unknown,
			fieldPath: MetadataPath
		) => unknown | undefined;
		assign: (value: unknown) => void;
	}> = [
		{
			key: 'actions',
			normalize: (value, fieldPath) =>
				normalizeActions<TItem>(value, issues, fieldPath),
			assign: (actions) => {
				config.actions = actions as ResourceDataViewConfig<
					TItem,
					TQuery
				>['actions'];
			},
		},
		{
			key: 'search',
			normalize: (value, fieldPath) =>
				normalizeBoolean(
					value,
					issues,
					fieldPath,
					'search must be a boolean when provided.'
				),
			assign: (search) => {
				config.search = search as boolean;
			},
		},
		{
			key: 'searchLabel',
			normalize: (value, fieldPath) =>
				normalizeNonEmptyString(
					value,
					issues,
					fieldPath,
					'searchLabel must be a non-empty string when provided.'
				),
			assign: (label) => {
				config.searchLabel = label as string;
			},
		},
		{
			key: 'getItemId',
			normalize: (value, fieldPath) =>
				normalizeFunctionValue<(item: TItem) => string>(
					value,
					issues,
					fieldPath,
					'getItemId must be a function when provided.'
				),
			assign: (getItemId) => {
				config.getItemId = getItemId as (item: TItem) => string;
			},
		},
		{
			key: 'perPageSizes',
			normalize: (value, fieldPath) =>
				normalizePerPageSizes(value, issues, fieldPath),
			assign: (perPageSizes) => {
				config.perPageSizes = perPageSizes as number[];
			},
		},
		{
			key: 'defaultLayouts',
			normalize: (value, fieldPath) =>
				normalizeDefaultLayouts(value, issues, fieldPath),
			assign: (layouts) => {
				config.defaultLayouts = layouts as Record<string, unknown>;
			},
		},
		{
			key: 'views',
			normalize: (value, fieldPath) =>
				normalizeSavedViews(value, issues, fieldPath),
			assign: (views) => {
				config.views = views as ResourceDataViewSavedView[];
			},
		},
		{
			key: 'screen',
			normalize: (value, fieldPath) =>
				normalizeScreen(value, issues, fieldPath),
			assign: (screen) => {
				config.screen = screen as ResourceDataViewScreenConfig;
			},
		},
	];

	for (const { key, normalize, assign } of optionalAssignments) {
		if (!applyOptional(metadata, key, path, normalize, assign)) {
			return undefined;
		}
	}

	if ('empty' in metadata) {
		config.empty = metadata.empty as ResourceDataViewConfig<
			TItem,
			TQuery
		>['empty'];
	}

	return config;
}
