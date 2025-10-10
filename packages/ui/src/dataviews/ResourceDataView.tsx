/* istanbul ignore file */
/* @jsxImportSource react */
import {
	useCallback,
	useEffect,
	useMemo,
	useState,
	type ComponentProps,
	type ReactNode,
} from 'react';
import {
	DataViews,
	type Action as DataViewAction,
	type ActionButton,
	type View,
} from '@wordpress/dataviews';
import type { KernelUIRuntime } from '@geekist/wp-kernel/data';
import type { ResourceObject, ListResponse } from '@geekist/wp-kernel/resource';
import type { CacheKeyPattern } from '@geekist/wp-kernel/resource/cache';
import { useOptionalKernelUI } from '../runtime/context';
import { createResourceDataViewController } from './resource-controller';
import { ensureControllerRuntime, isDataViewsRuntime } from './runtime';
import type {
	DataViewsRuntimeContext,
	ResourceDataViewActionConfig,
	ResourceDataViewConfig,
	ResourceDataViewController,
} from './types';
import { normalizeActionError } from './error-utils';
import { DataViewsControllerError } from '../runtime/dataviews/errors';

type RuntimeResolution = {
	kernelRuntime?: KernelUIRuntime;
	context: DataViewsRuntimeContext;
};

interface ResourceDataViewProps<TItem, TQuery> {
	resource?: ResourceObject<TItem, TQuery>;
	config?: ResourceDataViewConfig<TItem, TQuery>;
	controller?: ResourceDataViewController<TItem, TQuery>;
	runtime?: KernelUIRuntime | DataViewsRuntimeContext;
	fetchList?: (query: TQuery) => Promise<ListResponse<TItem>>;
	emptyState?: ReactNode;
}

function isKernelRuntime(
	candidate: KernelUIRuntime | DataViewsRuntimeContext
): candidate is KernelUIRuntime {
	return 'namespace' in candidate && 'events' in candidate;
}

function resolveRuntime(
	runtimeProp: KernelUIRuntime | DataViewsRuntimeContext | undefined,
	hookRuntime: KernelUIRuntime | null
): RuntimeResolution {
	if (runtimeProp) {
		if (isDataViewsRuntime(runtimeProp)) {
			return { context: runtimeProp };
		}
		if (isKernelRuntime(runtimeProp)) {
			if (!runtimeProp.dataviews) {
				throw new DataViewsControllerError(
					'Kernel UI runtime is missing DataViews support. Ensure Phase 1 runtime is attached.'
				);
			}
			return {
				kernelRuntime: runtimeProp,
				context: {
					namespace: runtimeProp.namespace,
					dataviews: ensureControllerRuntime(runtimeProp.dataviews),
					policies: runtimeProp.policies,
					invalidate: runtimeProp.invalidate,
					registry: runtimeProp.registry,
					reporter: runtimeProp.reporter,
					kernel: runtimeProp.kernel,
				},
			};
		}
	}

	if (!hookRuntime) {
		throw new DataViewsControllerError(
			'Kernel UI runtime unavailable. Provide a runtime prop or wrap with <KernelUIProvider />.'
		);
	}

	if (!hookRuntime.dataviews) {
		throw new DataViewsControllerError(
			'Kernel UI runtime is missing DataViews support. Ensure attachUIBindings() was executed with DataViews enabled.'
		);
	}

	return {
		kernelRuntime: hookRuntime,
		context: {
			namespace: hookRuntime.namespace,
			dataviews: ensureControllerRuntime(hookRuntime.dataviews),
			policies: hookRuntime.policies,
			invalidate: hookRuntime.invalidate,
			registry: hookRuntime.registry,
			reporter: hookRuntime.reporter,
			kernel: hookRuntime.kernel,
		},
	};
}

type AsyncListState<TItem> = {
	data?: ListResponse<TItem>;
	isLoading: boolean;
	error?: string;
};

function useAsyncList<TItem, TQuery>(
	fetchList: ((query: TQuery) => Promise<ListResponse<TItem>>) | undefined,
	query: TQuery,
	reporter: DataViewsRuntimeContext['reporter']
): AsyncListState<TItem> {
	const [state, setState] = useState<AsyncListState<TItem>>({
		data: undefined,
		isLoading: Boolean(fetchList),
		error: undefined,
	});

	useEffect(() => {
		let active = true;

		if (!fetchList) {
			setState({ data: undefined, isLoading: false, error: undefined });
			return () => {
				active = false;
			};
		}

		setState((prev) => ({ ...prev, isLoading: true }));

		fetchList(query)
			.then((data) => {
				if (!active) {
					return;
				}
				setState({ data, isLoading: false, error: undefined });
			})
			.catch((error: unknown) => {
				if (!active) {
					return;
				}
				const message =
					error instanceof Error
						? error.message
						: 'Failed to fetch list data';
				reporter.error?.('Standalone DataViews fetch failed', {
					error,
					query,
				});
				setState({
					data: undefined,
					isLoading: false,
					error: message,
				});
			});

		return () => {
			active = false;
		};
	}, [fetchList, query, reporter]);

	return state;
}

type ActionDecision = {
	allowed: boolean;
	loading: boolean;
};

type DataViewsActionContext<TItem> = Parameters<
	ActionButton<TItem>['callback']
>[1];

type DataViewsActionCallback<TItem> = (
	items: TItem[],
	context: DataViewsActionContext<TItem>
) => Promise<void>;

function buildInitialDecisions(
	controller: ResourceDataViewController<unknown, unknown>
): Map<string, ActionDecision> {
	const map = new Map<string, ActionDecision>();
	const actions = controller.config.actions ?? [];
	actions.forEach((action) => {
		if (action.policy) {
			map.set(action.id, { allowed: false, loading: true });
			return;
		}
		map.set(action.id, { allowed: true, loading: false });
	});
	return map;
}

function useActionDecisions(
	controller: ResourceDataViewController<unknown, unknown>
): Map<string, ActionDecision> {
	const [decisions, setDecisions] = useState<Map<string, ActionDecision>>(
		() => buildInitialDecisions(controller)
	);

	useEffect(() => {
		let cancelled = false;
		const actions = controller.config.actions ?? [];
		const reporter = controller.getReporter();
		const policyRuntime = controller.policies?.policy;
		const can = policyRuntime?.can as
			| ((key: string, ...args: unknown[]) => boolean | Promise<boolean>)
			| undefined;

		if (!can) {
			const next = new Map<string, ActionDecision>();
			actions.forEach((action) => {
				next.set(action.id, { allowed: true, loading: false });
			});
			setDecisions(next);
			return () => {
				cancelled = true;
			};
		}

		const next = new Map<string, ActionDecision>();
		actions.forEach((action) => {
			if (!action.policy) {
				next.set(action.id, { allowed: true, loading: false });
				return;
			}

			try {
				const result = can(action.policy);
				if (result instanceof Promise) {
					next.set(action.id, { allowed: false, loading: true });
					result
						.then((value) => {
							/* istanbul ignore if -- cancellation is handled by effect cleanup */
							if (cancelled) {
								return;
							}
							setDecisions((prev) => {
								const updated = new Map(prev);
								updated.set(action.id, {
									allowed: Boolean(value),
									loading: false,
								});
								return updated;
							});
						})
						.catch((error) => {
							/* istanbul ignore if -- cancellation is handled by effect cleanup */
							if (cancelled) {
								return;
							}
							reporter.warn?.(
								'Policy evaluation failed for DataViews action',
								{
									error,
									policy: action.policy,
								}
							);
							setDecisions((prev) => {
								const updated = new Map(prev);
								updated.set(action.id, {
									allowed: false,
									loading: false,
								});
								return updated;
							});
						});
					return;
				}

				next.set(action.id, {
					allowed: Boolean(result),
					loading: false,
				});
			} catch (error) {
				reporter.error?.('Policy evaluation threw an error', {
					error,
					policy: action.policy,
				});
				next.set(action.id, { allowed: false, loading: false });
			}
		});

		setDecisions(next);

		return () => {
			cancelled = true;
		};
	}, [controller, controller.config.actions]);

	return decisions;
}

function shouldRenderAction<TItem>(
	decision: ActionDecision,
	actionConfig: ResourceDataViewActionConfig<TItem, unknown, unknown>
): boolean {
	if (decision.loading) {
		return true;
	}
	if (decision.allowed) {
		return true;
	}
	return Boolean(actionConfig.disabledWhenDenied);
}

function getSelectionIdentifiers<TItem>(
	selectedItems: TItem[],
	getItemId: (item: TItem) => string
): string[] {
	return selectedItems
		.map((item) => getItemId(item))
		.map((id) => (id === undefined || id === null ? '' : String(id)))
		.filter((id) => id !== '');
}

function invalidateWithPatterns<TItem, TQuery>(
	controller: ResourceDataViewController<TItem, TQuery>,
	patterns: CacheKeyPattern[]
): void {
	if (patterns.length === 0) {
		return;
	}
	controller.invalidate?.(patterns);
	controller.resource?.invalidate?.(patterns);
}

function applyInvalidate<TItem, TQuery, TInput, TResult>(
	controller: ResourceDataViewController<TItem, TQuery>,
	actionConfig: ResourceDataViewActionConfig<TItem, TInput, TResult>,
	result: TResult,
	context: {
		selection: string[];
		items: TItem[];
		input: TInput;
	}
): void {
	const customPatterns = actionConfig.invalidateOnSuccess?.(result, context);

	if (customPatterns === false) {
		return;
	}

	if (Array.isArray(customPatterns) && customPatterns.length > 0) {
		invalidateWithPatterns(controller, customPatterns);
		return;
	}

	if (controller.resource) {
		const defaultKey = controller.resource.key?.('list');
		if (defaultKey) {
			invalidateWithPatterns(controller, [defaultKey]);
		}
	}
}

function createActionCallback<TItem, TQuery>(
	controller: ResourceDataViewController<TItem, TQuery>,
	actionConfig: ResourceDataViewActionConfig<TItem, unknown, unknown>,
	getItemId: (item: TItem) => string,
	decision: ActionDecision
): DataViewsActionCallback<TItem> {
	const reporter = controller.getReporter();

	return async (
		selectedItems: TItem[],
		context: DataViewsActionContext<TItem>
	) => {
		const selectionIds = getSelectionIdentifiers(selectedItems, getItemId);

		if (decision.loading) {
			controller.emitAction({
				actionId: actionConfig.id,
				selection: selectionIds,
				permitted: false,
				reason: 'policy-pending',
			});
			return;
		}

		if (!decision.allowed) {
			controller.emitAction({
				actionId: actionConfig.id,
				selection: selectionIds,
				permitted: false,
				reason: 'policy-denied',
			});
			reporter.warn?.('DataViews action blocked by policy', {
				actionId: actionConfig.id,
				selection: selectionIds,
			});
			return;
		}

		if (selectionIds.length === 0) {
			controller.emitAction({
				actionId: actionConfig.id,
				selection: selectionIds,
				permitted: false,
				reason: 'empty-selection',
			});
			return;
		}

		const input = actionConfig.getActionArgs({
			selection: selectionIds,
			items: selectedItems,
		}) as unknown;

		try {
			const result = await actionConfig.action(input as never);

			applyInvalidate<TItem, TQuery, unknown, unknown>(
				controller,
				actionConfig as ResourceDataViewActionConfig<
					TItem,
					unknown,
					unknown
				>,
				result,
				{
					selection: selectionIds,
					items: selectedItems,
					input,
				}
			);

			controller.emitAction({
				actionId: actionConfig.id,
				selection: selectionIds,
				permitted: true,
				meta: actionConfig.buildMeta?.({
					selection: selectionIds,
					items: selectedItems,
				}),
			});
			context.onActionPerformed?.(selectedItems);
		} catch (error) {
			const normalized = normalizeActionError(
				error,
				{
					actionId: actionConfig.id,
					resource: controller.resourceName,
					selection: selectionIds,
				},
				reporter
			);
			throw normalized;
		}
	};
}

function useDataViewActions<TItem, TQuery>(
	controller: ResourceDataViewController<TItem, TQuery>,
	getItemId: (item: TItem) => string
): DataViewAction<TItem>[] {
	const decisions = useActionDecisions(
		controller as ResourceDataViewController<unknown, unknown>
	);

	return useMemo(() => {
		const actions = controller.config.actions ?? [];
		if (actions.length === 0) {
			return [];
		}

		return actions.reduce<DataViewAction<TItem>[]>((acc, actionConfig) => {
			const decision = decisions.get(actionConfig.id) ?? {
				allowed: true,
				loading: false,
			};

			if (!shouldRenderAction<TItem>(decision, actionConfig)) {
				return acc;
			}

			const callback = createActionCallback(
				controller,
				actionConfig,
				getItemId,
				decision
			);

			acc.push({
				id: actionConfig.id,
				label: actionConfig.label,
				icon: undefined,
				isDestructive: actionConfig.isDestructive,
				isPrimary: actionConfig.isPrimary,
				supportsBulk: actionConfig.supportsBulk,
				disabled:
					(!decision.allowed &&
						Boolean(actionConfig.disabledWhenDenied)) ||
					decision.loading,
				callback: ((items, ctx) =>
					callback(items, ctx)) as ActionButton<TItem>['callback'],
			});

			return acc;
		}, []);
	}, [controller, decisions, getItemId]);
}

function computeTotalPages(totalItems: number, perPage: number): number {
	if (!perPage || perPage <= 0) {
		return 1;
	}
	return Math.max(1, Math.ceil(totalItems / perPage));
}

function mergeLayouts(
	defaultView: View,
	view: View
): Record<string, unknown> | undefined {
	const defaultLayout = (defaultView as { layout?: Record<string, unknown> })
		.layout;
	const viewLayout = (view as { layout?: Record<string, unknown> }).layout;

	if (!defaultLayout && !viewLayout) {
		return undefined;
	}

	return {
		...(typeof defaultLayout === 'object' ? defaultLayout : {}),
		...(typeof viewLayout === 'object' ? viewLayout : {}),
	};
}

function mergeViewWithDefaults(defaultView: View, view: View): View {
	const mergedLayout = mergeLayouts(defaultView, view);
	const merged = {
		...defaultView,
		...view,
		fields: view.fields ?? defaultView.fields,
		filters: view.filters ?? defaultView.filters,
		sort: view.sort ?? defaultView.sort,
	} as View;

	if (mergedLayout) {
		(merged as { layout?: Record<string, unknown> }).layout = mergedLayout;
	}

	return merged;
}

function useStableView(
	controller: ResourceDataViewController<unknown, unknown>,
	initial: View
): [View, (next: View) => void] {
	const [view, setView] = useState<View>(
		mergeViewWithDefaults(controller.config.defaultView, initial)
	);

	useEffect(() => {
		let active = true;
		controller.emitRegistered(controller.preferencesKey);
		controller
			.loadStoredView()
			.then((stored) => {
				if (!active || !stored) {
					return;
				}
				setView(
					mergeViewWithDefaults(controller.config.defaultView, stored)
				);
			})
			.catch(() => {
				// loadStoredView already logs via reporter when it fails
			});

		return () => {
			active = false;
			controller.emitUnregistered(controller.preferencesKey);
		};
	}, [controller]);

	const updateView = useCallback(
		(next: View) => {
			const normalized = mergeViewWithDefaults(
				controller.config.defaultView,
				next
			);
			setView(normalized);
			controller.saveView(normalized).catch(() => {
				controller
					.getReporter()
					.warn?.('Failed to persist DataViews view state');
			});
			controller.emitViewChange(normalized);
		},
		[controller]
	);

	return [view, updateView];
}

function useResolvedController<TItem, TQuery>(
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
			policies: context.policies,
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

function useListResult<TItem, TQuery>(
	controller: ResourceDataViewController<TItem, TQuery>,
	fetchList: ((query: TQuery) => Promise<ListResponse<TItem>>) | undefined,
	query: TQuery,
	reporter: DataViewsRuntimeContext['reporter']
): { data?: ListResponse<TItem>; isLoading?: boolean } {
	const listFromResource = controller.resource?.useList?.(query);
	const asyncList = useAsyncList(fetchList, query, reporter);
	return (listFromResource ?? asyncList) as {
		data?: ListResponse<TItem>;
		isLoading?: boolean;
	};
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

	return <DataViews {...dataViewsProps} />;
}
