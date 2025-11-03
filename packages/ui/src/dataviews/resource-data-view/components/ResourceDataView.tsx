/* @jsxImportSource react */
import { DataViews } from '@wordpress/dataviews';
import { useMemo, type ComponentProps } from 'react';
import { createNoopReporter } from '@wpkernel/core/reporter';
import { useResolvedController } from '../use-resolved-controller';
import { useDataViewActions } from '../use-data-view-actions';
import type { ResourceDataViewProps } from '../types/props';
import { useRuntimeContext } from '../state/use-runtime-context';
import { useViewState } from '../state/use-view-state';
import { useListState } from '../state/use-list-state';
import { useItemIdGetter } from '../state/use-item-id-getter';
import { useSelection } from '../state/use-selection';
import { usePaginationInfo } from '../state/use-pagination-info';
import { usePermissionState } from '../state/use-permission-state';
import { useDataViewsProps } from '../utils/build-data-views-props';
import { ResourceDataViewBoundary } from './boundary/ResourceDataViewBoundary';

export function ResourceDataView<TItem, TQuery>({
	resource,
	config,
	controller: controllerProp,
	runtime: runtimeProp,
	fetchList,
	emptyState,
}: ResourceDataViewProps<TItem, TQuery>) {
	const context = useRuntimeContext(runtimeProp);
	const controller = useResolvedController(
		controllerProp,
		resource,
		config,
		context,
		fetchList
	);

	const { view, setView, viewState } = useViewState(controller);
	const { listResult, items, totalItems } = useListState({
		controller,
		view,
		fetchList,
		reporter: context.reporter,
	});

	const getItemId = useItemIdGetter(controller.config);
	const reporter = useMemo(() => {
		const fromController =
			typeof controller.getReporter === 'function'
				? controller.getReporter()
				: undefined;

		return fromController ?? context.reporter ?? createNoopReporter();
	}, [controller, context.reporter]);
	const actions = useDataViewActions(controller, getItemId, context);
	const { selection, handleSelectionChange } = useSelection();
	const paginationInfo = usePaginationInfo(totalItems, viewState.perPage);
	const permission = usePermissionState(controller, reporter);

	const dataViewsProps = useDataViewsProps<TItem, TQuery>({
		controller,
		items,
		view,
		setView,
		actions,
		getItemId,
		isLoading: listResult.isLoading,
		paginationInfo,
		selection,
		onChangeSelection: handleSelectionChange,
		emptyState,
	}) as ComponentProps<typeof DataViews>;

	return (
		<div
			className="wpk-dataview"
			data-wpk-dataview={controller.resourceName}
			data-wpk-dataview-namespace={context.namespace}
			data-wpk-dataview-loading={
				listResult.status === 'loading' ? 'true' : 'false'
			}
			data-wpk-dataview-total={String(totalItems)}
		>
			<ResourceDataViewBoundary
				list={listResult}
				items={items}
				permission={permission}
				emptyState={emptyState}
			>
				<DataViews {...dataViewsProps} />
			</ResourceDataViewBoundary>
		</div>
	);
}
