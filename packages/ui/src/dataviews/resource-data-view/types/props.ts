import type { ReactNode } from 'react';
import type {
	DataViewsRuntimeContext,
	ResourceDataViewConfig,
	ResourceDataViewController,
} from '../../types';
import type { WPKernelUIRuntime } from '@wpkernel/core/data';
import type { ListResponse, ResourceObject } from '@wpkernel/core/resource';

export interface ResourceDataViewProps<TItem, TQuery> {
	resource?: ResourceObject<TItem, TQuery>;
	config?: ResourceDataViewConfig<TItem, TQuery>;
	controller?: ResourceDataViewController<TItem, TQuery>;
	runtime?: WPKernelUIRuntime | DataViewsRuntimeContext;
	fetchList?: (query: TQuery) => Promise<ListResponse<TItem>>;
	emptyState?: ReactNode;
}

export type ResourceDataViewRuntimeInput =
	| WPKernelUIRuntime
	| DataViewsRuntimeContext
	| undefined;
