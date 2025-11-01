import type { ResourceObject } from '@wpkernel/core/resource';
import type {
	ResourceDataViewActionConfig,
	ResourceDataViewConfig,
	ResourceDataViewMenuConfig,
	ResourceDataViewSavedView,
	ResourceDataViewScreenConfig,
} from '../../dataviews/types';
import type { Field, View } from '@wordpress/dataviews';

export const DATA_VIEWS_METADATA_INVALID =
	'DATA_VIEWS_METADATA_INVALID' as const;

export interface DataViewMetadataIssue {
	readonly code: typeof DATA_VIEWS_METADATA_INVALID;
	readonly path: ReadonlyArray<string | number>;
	readonly message: string;
	readonly received?: unknown;
}

export interface ResourceDataViewMetadata<TItem, TQuery> {
	readonly config: ResourceDataViewConfig<TItem, TQuery>;
	readonly preferencesKey?: string;
}

export interface MetadataNormalizationResult<TItem, TQuery> {
	readonly metadata?: ResourceDataViewMetadata<TItem, TQuery>;
	readonly issues: DataViewMetadataIssue[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

function normalizeNonEmptyString(
	value: unknown,
	issues: DataViewMetadataIssue[],
	path: ReadonlyArray<string | number>,
	message: string
): string | undefined {
	if (!isNonEmptyString(value)) {
		reportIssue(issues, path, message, value);
		return undefined;
	}

	return value;
}

function normalizeBoolean(
	value: unknown,
	issues: DataViewMetadataIssue[],
	path: ReadonlyArray<string | number>,
	message: string
): boolean | undefined {
	if (typeof value !== 'boolean') {
		reportIssue(issues, path, message, value);
		return undefined;
	}

	return value;
}

function normalizeFunctionValue<TValue>(
	value: unknown,
	issues: DataViewMetadataIssue[],
	path: ReadonlyArray<string | number>,
	message: string
): TValue | undefined {
	if (typeof value !== 'function') {
		reportIssue(issues, path, message, value);
		return undefined;
	}

	return value as TValue;
}

function normalizeNumber(
	value: unknown,
	issues: DataViewMetadataIssue[],
	path: ReadonlyArray<string | number>,
	message: string
): number | undefined {
	if (typeof value !== 'number' || Number.isNaN(value)) {
		reportIssue(issues, path, message, value);
		return undefined;
	}

	return value;
}

function applyOptional<TValue>(
	source: Record<string, unknown>,
	key: string,
	basePath: ReadonlyArray<string | number>,
	normalize: (
		value: unknown,
		path: ReadonlyArray<string | number>
	) => TValue | undefined,
	assign: (value: TValue) => void
): boolean {
	if (!(key in source)) {
		return true;
	}

	const normalized = normalize(source[key], [...basePath, key]);

	if (normalized === undefined) {
		return false;
	}

	assign(normalized);
	return true;
}

function reportIssue(
	issues: DataViewMetadataIssue[],
	path: ReadonlyArray<string | number>,
	message: string,
	received?: unknown
): undefined {
	issues.push({
		code: DATA_VIEWS_METADATA_INVALID,
		path,
		message,
		received,
	});
	return undefined;
}

function cloneWithUnknown<T>(value: T): T {
	if (!value || typeof value !== 'object') {
		return value;
	}

	return { ...(value as Record<string, unknown>) } as unknown as T;
}

function normalizeFields<TItem>(
	value: unknown,
	issues: DataViewMetadataIssue[],
	path: ReadonlyArray<string | number>
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

		const id = (entry as { id?: unknown }).id;

		if (!isNonEmptyString(id)) {
			reportIssue(
				issues,
				[...path, index, 'id'],
				'Field id must be a non-empty string.',
				id
			);
			return;
		}

		normalized.push(cloneWithUnknown(entry as Field<TItem>));
	});

	if (normalized.length !== value.length) {
		return undefined;
	}

	return normalized;
}

function normalizeView(
	value: unknown,
	issues: DataViewMetadataIssue[],
	path: ReadonlyArray<string | number>
): View | undefined {
	if (!isRecord(value)) {
		return reportIssue(
			issues,
			path,
			'View definition must be an object.',
			value
		);
	}

	const type = (value as { type?: unknown }).type;

	if (!isNonEmptyString(type)) {
		return reportIssue(
			issues,
			[...path, 'type'],
			'View type must be a non-empty string.',
			type
		);
	}

	return cloneWithUnknown(value as unknown as View);
}

function normalizeActions<TItem>(
	value: unknown,
	issues: DataViewMetadataIssue[],
	path: ReadonlyArray<string | number>
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

		const id = (entry as { id?: unknown }).id;

		if (!isNonEmptyString(id)) {
			reportIssue(
				issues,
				[...path, index, 'id'],
				'Action id must be a non-empty string.',
				id
			);
			return;
		}

		normalized.push(
			cloneWithUnknown(
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

function normalizePerPageSizes(
	value: unknown,
	issues: DataViewMetadataIssue[],
	path: ReadonlyArray<string | number>
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

function normalizeDefaultLayouts(
	value: unknown,
	issues: DataViewMetadataIssue[],
	path: ReadonlyArray<string | number>
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

		normalized[layoutKey] = cloneWithUnknown(
			layoutValue as Record<string, unknown>
		);
	}

	return normalized;
}

function normalizeMenu(
	value: unknown,
	issues: DataViewMetadataIssue[],
	path: ReadonlyArray<string | number>
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

	const menu: ResourceDataViewMenuConfig = {
		slug,
		title,
	};

	const optionalAssignments: Array<{
		key: string;
		normalize: (
			candidate: unknown,
			fieldPath: ReadonlyArray<string | number>
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

function normalizeScreen(
	value: unknown,
	issues: DataViewMetadataIssue[],
	path: ReadonlyArray<string | number>
): ResourceDataViewScreenConfig | undefined {
	if (!isRecord(value)) {
		return reportIssue(
			issues,
			path,
			'Screen configuration must be an object.',
			value
		);
	}

	const screen: ResourceDataViewScreenConfig = {};
	const stringKeys = [
		'component',
		'route',
		'resourceImport',
		'resourceSymbol',
		'kernelImport',
		'kernelSymbol',
	] as const;

	for (const key of stringKeys) {
		if (
			!applyOptional(
				value as Record<string, unknown>,
				key,
				path,
				(candidate, fieldPath) =>
					normalizeNonEmptyString(
						candidate,
						issues,
						fieldPath,
						`${key} must be a non-empty string when provided.`
					),
				(stringValue) => {
					screen[key] = stringValue as string;
				}
			)
		) {
			return undefined;
		}
	}

	if (
		!applyOptional(
			value as Record<string, unknown>,
			'menu',
			path,
			(candidate, fieldPath) =>
				normalizeMenu(candidate, issues, fieldPath),
			(menu) => {
				screen.menu = menu as ResourceDataViewMenuConfig;
			}
		)
	) {
		return undefined;
	}

	for (const [key, extra] of Object.entries(value)) {
		if (
			key === 'menu' ||
			stringKeys.includes(key as (typeof stringKeys)[number])
		) {
			continue;
		}
		(screen as Record<string, unknown>)[key] = extra;
	}

	return screen;
}

function buildSavedView(
	entry: unknown,
	issues: DataViewMetadataIssue[],
	path: ReadonlyArray<string | number>
): ResourceDataViewSavedView | undefined {
	if (!isRecord(entry)) {
		reportIssue(issues, path, 'Saved view entries must be objects.', entry);
		return undefined;
	}

	const normalizedId = normalizeNonEmptyString(
		(entry as { id?: unknown }).id,
		issues,
		[...path, 'id'],
		'Saved view id must be a non-empty string.'
	);
	const normalizedLabel = normalizeNonEmptyString(
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

	if (!normalizedId || !normalizedLabel || !view) {
		return undefined;
	}

	const savedView: ResourceDataViewSavedView = {
		id: normalizedId,
		label: normalizedLabel,
		view,
	};

	const optionalAssignments: Array<{
		key: string;
		normalize: (
			value: unknown,
			fieldPath: ReadonlyArray<string | number>
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

function normalizeSavedViews(
	value: unknown,
	issues: DataViewMetadataIssue[],
	path: ReadonlyArray<string | number>
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

	for (let index = 0; index < value.length; index += 1) {
		const savedView = buildSavedView(value[index], issues, [
			...path,
			index,
		]);

		if (!savedView) {
			continue;
		}

		views.push(savedView);
	}

	if (views.length !== value.length) {
		return undefined;
	}

	return views;
}

function buildConfig<TItem, TQuery>(
	metadata: Record<string, unknown>,
	issues: DataViewMetadataIssue[],
	path: ReadonlyArray<string | number>
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
			fieldPath: ReadonlyArray<string | number>
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

export function normalizeResourceDataViewMetadata<TItem, TQuery>(
	resource: ResourceObject<TItem, TQuery>
): MetadataNormalizationResult<TItem, TQuery> {
	const issues: DataViewMetadataIssue[] = [];
	const metadataPath = ['ui', 'admin', 'dataviews'] as const;

	const candidate = (
		resource as ResourceObject<TItem, TQuery> & {
			ui?: {
				admin?: {
					dataviews?: unknown;
				};
			};
		}
	).ui?.admin?.dataviews;

	if (candidate === undefined) {
		return { issues };
	}

	if (!isRecord(candidate)) {
		reportIssue(
			issues,
			metadataPath,
			'resource.ui.admin.dataviews must be an object.',
			candidate
		);
		return { issues };
	}

	const { preferencesKey, ...rawConfig } = candidate as Record<
		string,
		unknown
	> & {
		preferencesKey?: unknown;
	};

	if (preferencesKey !== undefined && !isNonEmptyString(preferencesKey)) {
		reportIssue(
			issues,
			[...metadataPath, 'preferencesKey'],
			'preferencesKey must be a non-empty string when provided.',
			preferencesKey
		);
	}

	const config = buildConfig<TItem, TQuery>(rawConfig, issues, metadataPath);

	if (!config || issues.length > 0) {
		return { issues };
	}

	return {
		metadata: {
			config,
			preferencesKey: preferencesKey as string | undefined,
		},
		issues,
	};
}
