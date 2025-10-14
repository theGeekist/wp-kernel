import { useMemo } from 'react';
import type { ListResponse, ResourceObject } from '@wpkernel/core/resource';
import { createResourceDataViewController } from '../resource-controller';
import { DataViewsControllerError } from '../../runtime/dataviews/errors';
import type {
	DataViewsRuntimeContext,
	ResourceDataViewConfig,
	ResourceDataViewController,
} from '../types';

export function useResolvedController<TItem, TQuery>(
	controllerProp: ResourceDataViewController<TItem, TQuery> | undefined,
	resource: ResourceObject<TItem, TQuery> | undefined,
	config: ResourceDataViewConfig<TItem, TQuery> | undefined,
	context: DataViewsRuntimeContext,
	fetchList?: (query: TQuery) => Promise<ListResponse<TItem>>
): ResourceDataViewController<TItem, TQuery> {
	return useMemo(() => {
		if (controllerProp) {
			return controllerProp;
		}

		if (!resource || !config) {
			throw new DataViewsControllerError(
				'ResourceDataView requires a resource and config when controller is not provided.'
			);
		}

		return createResourceDataViewController<TItem, TQuery>({
			resource,
			config,
			runtime: context.dataviews,
			namespace: context.namespace,
			invalidate: context.invalidate,
			policies: () => context.policies,
			fetchList,
			prefetchList: resource.prefetchList,
		});
	}, [
		controllerProp,
		resource,
		config,
		context.dataviews,
		context.namespace,
		context.invalidate,
		context.policies,
		fetchList,
	]);
}
