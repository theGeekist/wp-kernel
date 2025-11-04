import type { ReactNode } from 'react';
import type {
	DataViewsRuntimeContext,
	ResourceDataViewConfig,
	ResourceDataViewController,
} from '../../types';
import type { WPKernelUIRuntime } from '@wpkernel/core/data';
import type { ListResponse, ResourceObject } from '@wpkernel/core/resource';

/**
 * Props for the ResourceDataView component.
 *
 * @category DataViews Integration
 * @template TItem - The type of the items in the resource list.
 * @template TQuery - The type of the query parameters for the resource.
 */
export interface ResourceDataViewProps<TItem, TQuery> {
	/** The resource object to display. */
	resource?: ResourceObject<TItem, TQuery>;
	/** The configuration for the DataView. */
	config?: ResourceDataViewConfig<TItem, TQuery>;
	/** An optional pre-configured controller for the DataView. */
	controller?: ResourceDataViewController<TItem, TQuery>;
	/** The runtime context for the DataView. */
	runtime?: WPKernelUIRuntime | DataViewsRuntimeContext;
	/** An optional function to fetch a list of items, overriding the resource's fetchList. */
	fetchList?: (query: TQuery) => Promise<ListResponse<TItem>>;
	/** Content to display when the DataView is empty. */
	emptyState?: ReactNode;
}

/**
 * Represents the possible input types for the ResourceDataView runtime.
 *
 * @category DataViews Integration
 */
export type ResourceDataViewRuntimeInput =
	| WPKernelUIRuntime
	| DataViewsRuntimeContext
	| undefined;
