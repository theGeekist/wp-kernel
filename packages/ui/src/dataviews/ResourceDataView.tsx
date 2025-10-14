/* istanbul ignore file */
/* @jsxImportSource react */
import {
	useCallback,
	useMemo,
	useState,
	type ComponentProps,
	type ReactNode,
} from 'react';
import { DataViews } from '@wordpress/dataviews';
import type { KernelUIRuntime } from '@wpkernel/core/data';
import type { ListResponse, ResourceObject } from '@wpkernel/core/resource';
import { useOptionalKernelUI } from '../runtime/context';
import type {
	DataViewsRuntimeContext,
	ResourceDataViewConfig,
	ResourceDataViewController,
} from './types';
import { resolveRuntime } from './resource-data-view/runtime-resolution';
import { useResolvedController } from './resource-data-view/use-resolved-controller';
import { useStableView } from './resource-data-view/use-stable-view';
import { useDataViewActions } from './resource-data-view/use-data-view-actions';
import { useListResult } from './resource-data-view/use-list-result';

type ResourceDataViewProps<TItem, TQuery> = {
	resource?: ResourceObject<TItem, TQuery>;
	config?: ResourceDataViewConfig<TItem, TQuery>;
	controller?: ResourceDataViewController<TItem, TQuery>;
	runtime?: KernelUIRuntime | DataViewsRuntimeContext;
	fetchList?: (query: TQuery) => Promise<ListResponse<TItem>>;
	emptyState?: ReactNode;
};

function computeTotalPages(totalItems: number, perPage: number): number {
	if (!perPage || perPage <= 0) {
		return 1;
	}
	return Math.max(1, Math.ceil(totalItems / perPage));
}

export function ResourceDataView<TItem, TQuery>({
	resource,
	config,
	controller: controllerProp,
	runtime: runtimeProp,
	fetchList,
	emptyState,
}: ResourceDataViewProps<TItem, TQuery>) {
	const runtimeFromHook = useOptionalKernelUI();
	const { context } = resolveRuntime(runtimeProp, runtimeFromHook);

	const controller = useResolvedController(
		controllerProp,
		resource,
		config,
		context,
		fetchList
	);

	const [view, setView] = useStableView(
		controller as ResourceDataViewController<unknown, unknown>,
		controller.config.defaultView
	);

	const viewState = useMemo(
		() =>
			controller.deriveViewState(view) as ReturnType<
				ResourceDataViewController<TItem, TQuery>['deriveViewState']
			>,
		[controller, view]
	);

	const query = useMemo(
		() => controller.mapViewToQuery(view),
		[controller, view]
	);

	const listResult = useListResult(
		controller,
		fetchList,
		query,
		context.reporter
	);

	const items = listResult.data?.items ?? [];
	const totalItems = listResult.data?.total ?? items.length;

	const getItemId = useCallback(
		(item: TItem) => {
			const fromConfig = controller.config.getItemId?.(item);
			if (
				typeof fromConfig === 'string' ||
				typeof fromConfig === 'number'
			) {
				return String(fromConfig);
			}
			const fallback = (item as unknown as { id?: string | number }).id;
			return typeof fallback === 'undefined' ? '' : String(fallback);
		},
		[controller.config]
	);

	const dataViewActions = useDataViewActions(controller, getItemId);

	const [selection, setSelection] = useState<string[]>([]);

	const paginationInfo = useMemo(() => {
		const perPage = viewState.perPage;
		return {
			totalItems,
			totalPages: computeTotalPages(totalItems, perPage),
		};
	}, [totalItems, viewState.perPage]);

	const isLoading = Boolean(listResult.isLoading);

	const dataViewsProps: ComponentProps<typeof DataViews> = {
		data: items,
		view,
		onChangeView: setView,
		fields: controller.config.fields as ComponentProps<
			typeof DataViews
		>['fields'],
		actions: dataViewActions as ComponentProps<typeof DataViews>['actions'],
		getItemId: getItemId as ComponentProps<typeof DataViews>['getItemId'],
		isLoading: Boolean(listResult.isLoading),
		paginationInfo,
		selection,
		onChangeSelection: setSelection,
		search: controller.config.search ?? true,
		searchLabel: controller.config.searchLabel,
		defaultLayouts:
			(controller.config.defaultLayouts as ComponentProps<
				typeof DataViews
			>['defaultLayouts']) ??
			({} as ComponentProps<typeof DataViews>['defaultLayouts']),
		config: {
			perPageSizes: controller.config.perPageSizes ?? [10, 20, 50, 100],
		},
		empty: emptyState,
	};

	return (
		<div
			className="wpk-dataview"
			data-wpk-dataview={controller.resourceName}
			data-wpk-dataview-namespace={context.namespace}
			data-wpk-dataview-loading={isLoading ? 'true' : 'false'}
			data-wpk-dataview-total={String(totalItems)}
		>
			<DataViews {...dataViewsProps} />
		</div>
	);
}
