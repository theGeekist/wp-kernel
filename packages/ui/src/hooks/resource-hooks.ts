/**
 * Resource React Hooks Attachment
 *
 * Provides React hooks (useGet, useList) for kernel resources by integrating
 * with WordPress data stores. Hooks are attached to ResourceObject instances
 * at module load time or queued for late attachment if resources are defined
 * before this UI bundle loads.
 *
 * @see Product Specification § 4.1 Resources
 * @module resource-hooks
 */
import { KernelError } from '@wpkernel/core/error';
import type { ResourceObject, ListResponse } from '@wpkernel/core/resource';
import type { KernelUIRuntime } from '@wpkernel/core/data';
import { useKernelUI } from '../runtime/context';

/**
 * WordPress data store selector shape
 * Internal type representing the store selectors we expect from wp.data
 *
 * @internal
 */
type WordPressStoreSelector<T, TQuery = unknown> = {
	getItem?: (id: string | number) => T | undefined;
	getList?: (query?: TQuery) => ListResponse<T> | undefined;
	getListStatus?: (query?: TQuery) => string | undefined;
	isResolving?: (method: string, args: unknown[]) => boolean;
	hasFinishedResolution?: (method: string, args: unknown[]) => boolean;
	getItemError?: (id: string | number) => string | undefined;
	getListError?: (query?: TQuery) => string | undefined;
};

/**
 * WordPress select function shape
 * Internal type for wp.data.useSelect callback signature
 *
 * @internal
 */
type WordPressSelectFunction<T, TQuery = unknown> = (
	storeKey: string
) => WordPressStoreSelector<T, TQuery> | undefined;

/**
 * Result shape for single-item resource hooks
 *
 * @template T - Entity type returned by the resource
 */
export interface UseResourceItemResult<T> {
	/** The fetched entity, or undefined if not yet loaded */
	data: T | undefined;
	/** True if the data is currently being fetched or resolved */
	isLoading: boolean;
	/** Error message if the fetch failed, undefined otherwise */
	error: string | undefined;
}

/**
 * Result shape for list resource hooks
 *
 * @template T - Entity type in the list
 */
export interface UseResourceListResult<T> {
	/** The fetched list response with items and metadata, or undefined if not yet loaded */
	data: ListResponse<T> | undefined;
	/** True if the data is currently being fetched or resolved */
	isLoading: boolean;
	/** Error message if the fetch failed, undefined otherwise */
	error: string | undefined;
}

/**
 * Resolve WordPress global in a SSR-safe way
 *
 * @param source
 * @internal
 * @return WordPress global object or undefined if not available
 */
function resolveWpGlobalFromSource(
	source?: (Window & WPGlobal) | undefined
): WPGlobal['wp'] | undefined {
	if (!source) {
		return undefined;
	}
	return source.wp;
}

function resolveWpGlobal(): WPGlobal['wp'] | undefined {
	const candidate = (globalThis as { window?: Window & WPGlobal }).window;
	return resolveWpGlobalFromSource(candidate);
}

/**
 * Ensure WordPress data useSelect hook is available
 *
 * @internal
 * @param resource - The resource requiring useSelect
 * @param method   - The hook method name for error messaging
 * @throws When @wordpress/data is not loaded
 * @return WordPress data module
 */
function ensureUseSelect<T, TQuery>(
	resource: ResourceObject<T, TQuery>,
	method: 'useGet' | 'useList'
) {
	const wp = resolveWpGlobal();
	if (!wp?.data?.useSelect) {
		throw new KernelError('DeveloperError', {
			message: `${method} requires @wordpress/data to be loaded`,
			context: {
				resource: resource.name,
				method,
			},
		});
	}

	return wp.data;
}

/**
 * Create a React hook for fetching single entities from a resource
 *
 * @internal
 * @template T - Entity type
 * @template TQuery - Query parameter type
 * @param    resource - The resource object to create hook for
 * @return Hook function that accepts an entity ID and returns loading state + data
 */
function createUseGet<T, TQuery>(resource: ResourceObject<T, TQuery>) {
	return (id: string | number): UseResourceItemResult<T> => {
		useKernelUI();
		const wpData = ensureUseSelect(resource, 'useGet');

		return wpData.useSelect(
			(select: WordPressSelectFunction<T>) => {
				void resource.store;

				const storeSelect = select(resource.storeKey);
				const data = storeSelect?.getItem?.(id);
				const error = storeSelect?.getItemError?.(id);
				const isLoading = computeItemLoading(storeSelect, id);

				return { data, isLoading, error };
			},
			[id]
		);
	};
}

/**
 * Create a React hook for fetching entity lists from a resource
 *
 * @internal
 * @template T - Entity type in the list
 * @template TQuery - Query parameter type
 * @param    resource - The resource object to create hook for
 * @return Hook function that accepts query params and returns loading state + list data
 */
function createUseList<T, TQuery>(resource: ResourceObject<T, TQuery>) {
	return (query?: TQuery): UseResourceListResult<T> => {
		useKernelUI();
		const wpData = ensureUseSelect(resource, 'useList');

		return wpData.useSelect(
			(select: WordPressSelectFunction<T, TQuery>) => {
				void resource.store;

				const storeSelect = select(resource.storeKey);
				const data = storeSelect?.getList?.(query);
				const error = storeSelect?.getListError?.(query);
				const isLoading = computeListLoading(storeSelect, query);

				return { data, isLoading, error };
			},
			[query]
		);
	};
}

/**
 * Attach `useGet` and `useList` React helpers to a resource definition.
 *
 * The hooks wrap `@wordpress/data.useSelect()` to expose resource data with
 * loading and error states that mirror resolver status. They are registered on
 * demand when the UI bundle is evaluated so resource modules remain tree-shake
 * friendly for non-React contexts.
 *
 * @template T - Entity type
 * @template TQuery - Query parameter type
 * @param    resource - Resource definition to augment with hooks
 * @param    _runtime - Active Kernel UI runtime (unused placeholder for API symmetry)
 * @return The same resource object with hooks attached
 */
export function attachResourceHooks<T, TQuery>(
	resource: ResourceObject<T, TQuery>,
	_runtime?: KernelUIRuntime
): ResourceObject<T, TQuery> {
	if (resource.routes.get) {
		resource.useGet = createUseGet(resource);
	}

	if (resource.routes.list) {
		resource.useList = createUseList(resource);
	}

	return resource;
}

function computeItemLoading<T>(
	selector: WordPressStoreSelector<T> | undefined,
	id: string | number
): boolean {
	if (isItemResolving(selector, id)) {
		return true;
	}
	return isItemAwaitingResolution(selector, id);
}

function computeListLoading<T, TQuery>(
	selector: WordPressStoreSelector<T, TQuery> | undefined,
	query: TQuery | undefined
): boolean {
	const status = selector?.getListStatus?.(query) ?? 'idle';

	if (shouldShowLoadingState(selector, query, status)) {
		return true;
	}

	return isListResolving(selector, query);
}

function isItemResolving<T>(
	selector: WordPressStoreSelector<T> | undefined,
	id: string | number
): boolean {
	return Boolean(selector?.isResolving?.('getItem', [id]));
}

function isItemAwaitingResolution<T>(
	selector: WordPressStoreSelector<T> | undefined,
	id: string | number
): boolean {
	return selector?.hasFinishedResolution?.('getItem', [id]) === false;
}

function isListResolving<T, TQuery>(
	selector: WordPressStoreSelector<T, TQuery> | undefined,
	query: TQuery | undefined
): boolean {
	return Boolean(selector?.isResolving?.('getList', [query]));
}

function shouldShowLoadingState<T, TQuery>(
	selector: WordPressStoreSelector<T, TQuery> | undefined,
	query: TQuery | undefined,
	status: string
): boolean {
	if (status === 'loading') {
		return true;
	}

	const resolvedByStatus = status === 'success' || status === 'error';

	// If status explicitly indicates resolution, trust it
	if (resolvedByStatus) {
		return false;
	}

	// For idle status, check if resolution has started
	if (status === 'idle') {
		const hasFinished = selector?.hasFinishedResolution?.('getList', [
			query,
		]);
		if (hasFinished === false) {
			return true;
		}
	}

	return false;
}

export const __TESTING__ = {
	resolveWpGlobal,
	resolveWpGlobalFromSource,
	ensureUseSelect,
	computeItemLoading,
	computeListLoading,
	isItemResolving,
	isItemAwaitingResolution,
	isListResolving,
	shouldShowLoadingState,
};
