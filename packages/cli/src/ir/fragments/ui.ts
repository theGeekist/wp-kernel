import { createHelper } from '../../runtime';
import type { IrFragment, IrFragmentApplyOptions } from '../types';
import type {
	IRUiSurface,
	IRUiResourceDescriptor,
	IRUiMenuConfig,
	IRResource,
} from '../publicTypes';
import type { ResourceDataViewsMenuConfig } from '@wpkernel/core/resource';

/**
 * Fragment key for UI aggregation.
 */
export const UI_FRAGMENT_KEY = 'ir.ui.resources';

/**
 * Builds normalized UI metadata from resource DataViews definitions.
 *
 * @category IR
 */
export function createUiFragment(): IrFragment {
	return createHelper({
		key: UI_FRAGMENT_KEY,
		kind: 'fragment',
		dependsOn: ['ir.meta.core', 'ir.resources.core'],
		async apply({ input, output }: IrFragmentApplyOptions) {
			const namespace =
				input.draft.meta?.namespace ?? input.options.namespace ?? '';
			const resources = input.draft.resources ?? [];

			const surface: IRUiSurface = {
				resources: collectUiResourceDescriptors(namespace, resources),
			};
			output.assign({
				ui: surface,
			});
		},
	});
}

function collectUiResourceDescriptors(
	namespace: string,
	resources: readonly IRResource[]
): IRUiResourceDescriptor[] {
	const descriptors: IRUiResourceDescriptor[] = [];

	for (const resource of resources) {
		const dataviews = resource.ui?.admin?.dataviews;
		if (!dataviews) {
			continue;
		}

		const preferencesKey =
			dataviews.preferencesKey ??
			`${namespace}/dataviews/${resource.name}`;
		const menu = normaliseMenu(dataviews.screen?.menu);

		descriptors.push(
			menu
				? { resource: resource.name, preferencesKey, menu }
				: { resource: resource.name, preferencesKey }
		);
	}

	return descriptors;
}

type MutableMenuConfig = {
	-readonly [Key in keyof IRUiMenuConfig]?: IRUiMenuConfig[Key];
};

function normaliseMenu(
	menu?: ResourceDataViewsMenuConfig | null
): IRUiMenuConfig | undefined {
	if (!menu) {
		return undefined;
	}

	const normalized: MutableMenuConfig = {};

	type MenuStringKey = Extract<
		keyof IRUiMenuConfig,
		'slug' | 'title' | 'capability' | 'parent'
	>;

	const stringFields: Array<{
		readonly key: MenuStringKey;
		readonly value: unknown;
	}> = [
		{ key: 'slug', value: menu.slug },
		{ key: 'title', value: menu.title },
		{ key: 'capability', value: menu.capability },
		{ key: 'parent', value: menu.parent },
	];

	for (const { key, value } of stringFields) {
		if (typeof value === 'string' && value.length > 0) {
			const stringValue = value;
			normalized[key] = stringValue;
		}
	}

	if (typeof menu.position === 'number' && Number.isFinite(menu.position)) {
		normalized.position = menu.position;
	}

	return Object.keys(normalized).length > 0
		? (normalized as IRUiMenuConfig)
		: undefined;
}
