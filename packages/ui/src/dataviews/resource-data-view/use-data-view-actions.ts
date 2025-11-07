import { useEffect, useMemo, useState } from 'react';
import type {
	Action as DataViewAction,
	ActionButton,
} from '@wordpress/dataviews';
import { __ } from '@wordpress/i18n';
import type { CacheKeyPattern } from '@wpkernel/core/resource';
import type { Reporter } from '@wpkernel/core/reporter';
import { createNoopReporter } from '@wpkernel/core/reporter';
import { WPKernelError } from '@wpkernel/core/error';
import { normalizeActionError } from '../error-utils';
import type {
	ResourceDataViewActionConfig,
	ResourceDataViewController,
	DataViewsRuntimeContext,
} from '../types';
import { formatActionSuccessMessage } from './i18n';
import type { DataViewPermissionDeniedReason } from '../../runtime/dataviews/events';

/**
 * Capability evaluation outcome for a single action.
 */
type ActionDecision = {
	/** Whether the action is allowed for the current user. */
	allowed: boolean;
	/** Whether capability resolution is still in progress. */
	loading: boolean;
	/** Optional denial reason surfaced to permission events. */
	reason?: DataViewPermissionDeniedReason;
	/** Optional error when capability checks fail unexpectedly. */
	error?: WPKernelError;
};

/**
 * DataViews callback context as provided by `@wordpress/dataviews`.
 */
type DataViewsActionContext<TItem> = Parameters<
	ActionButton<TItem>['callback']
>[1];

/**
 * Normalized async callback signature used internally.
 */
type DataViewsActionCallback<TItem> = (
	items: TItem[],
	context: DataViewsActionContext<TItem>
) => Promise<void>;

type NoticeOptions = {
	readonly id?: string;
};

/**
 * Thin wrapper around `core/notices` to emit success/error notices.
 */
type NoticeHandlers = {
	success: (message: string, options?: NoticeOptions) => void;
	error: (message: string, options?: NoticeOptions) => void;
};

const noopNotice = () => {
	// Intentionally empty: used when registry or core/notices are unavailable.
};

/**
 * Normalize any error thrown during capability evaluation into a WPKernelError.
 *
 * Logs via the provided reporter at the selected severity.
 * @param value
 * @param reporter
 * @param context
 * @param context.capability
 * @param context.resource
 * @param level
 */
function normalizeActionCapabilityError(
	value: unknown,
	reporter: Reporter,
	context: { capability: string; resource: string },
	level: 'warn' | 'error'
): WPKernelError {
	const message =
		level === 'warn'
			? 'Capability evaluation failed for DataViews action'
			: 'Capability evaluation threw an error';

	if (WPKernelError.isWPKernelError(value)) {
		if (level === 'warn') {
			reporter.warn?.(message, {
				error: value,
				capability: context.capability,
				resource: context.resource,
			});
		} else {
			reporter.error?.(message, {
				error: value,
				capability: context.capability,
				resource: context.resource,
			});
		}
		return value;
	}

	const baseError = value instanceof Error ? value : new Error(message);
	const normalized = WPKernelError.wrap(baseError, 'CapabilityDenied', {
		resourceName: context.resource,
		capability: context.capability,
	});

	if (level === 'warn') {
		reporter.warn?.(message, {
			error: normalized,
			capability: context.capability,
			resource: context.resource,
		});
	} else {
		reporter.error?.(message, {
			error: normalized,
			capability: context.capability,
			resource: context.resource,
		});
	}

	return normalized;
}

/**
 * Resolve notice helpers backed by `core/notices` when available.
 *
 * Falls back to no-op handlers when the registry or dispatcher cannot be resolved.
 * @param registry
 * @param reporter
 */
function resolveNoticeHandlers(
	registry: DataViewsRuntimeContext['registry'],
	reporter: Reporter
): NoticeHandlers {
	if (!registry) {
		return { success: noopNotice, error: noopNotice };
	}

	const candidate = registry as { dispatch?: (store: string) => unknown };
	if (typeof candidate.dispatch !== 'function') {
		return { success: noopNotice, error: noopNotice };
	}

	try {
		const dispatcher = candidate.dispatch('core/notices') as {
			createNotice?: (
				type: 'success' | 'error',
				message: string,
				options?: Record<string, unknown>
			) => void;
		};

		if (typeof dispatcher?.createNotice !== 'function') {
			return { success: noopNotice, error: noopNotice };
		}

		const createNotice = dispatcher.createNotice;

		return {
			success: (message: string, options?: NoticeOptions) => {
				createNotice('success', message, {
					speak: true,
					isDismissible: true,
					context: 'wpkernel/dataviews',
					...options,
				});
			},
			error: (message: string, options?: NoticeOptions) => {
				createNotice('error', message, {
					speak: true,
					isDismissible: true,
					context: 'wpkernel/dataviews',
					...options,
				});
			},
		} satisfies NoticeHandlers;
	} catch (error) {
		reporter.warn?.(
			'Failed to resolve core/notices dispatcher for DataViews actions',
			{
				error,
			}
		);
		return { success: noopNotice, error: noopNotice };
	}
}

/**
 * Normalize an internal decision into a permission denial reason suitable for events.
 * @param decision
 */
function determineDeniedReason(
	decision: ActionDecision
): DataViewPermissionDeniedReason {
	if (decision.reason === 'runtime-missing') {
		return 'runtime-missing';
	}

	if (decision.reason === 'error') {
		return 'error';
	}

	return 'forbidden';
}

/**
 * Emit a structured permission denied event from an action attempt.
 * @param controller
 * @param actionId
 * @param capability
 * @param selection
 * @param reason
 * @param error
 */
function emitPermissionEvent<TItem, TQuery>(
	controller: ResourceDataViewController<TItem, TQuery>,
	actionId: string,
	capability: string | undefined,
	selection: string[],
	reason: DataViewPermissionDeniedReason,
	error?: WPKernelError
): void {
	controller.emitPermissionDenied({
		actionId,
		capability,
		selection,
		source: 'action',
		reason,
		error,
	});
}

/**
 * Resolve a human-readable label for an action.
 *
 * Falls back to the action id when no label is provided.
 * @param actionConfig
 */
function resolveActionLabel<TItem>(
	actionConfig: ResourceDataViewActionConfig<TItem, unknown, unknown>
): string {
	if (typeof actionConfig.label === 'string') {
		return actionConfig.label;
	}
	return actionConfig.id;
}

/**
 * Build initial capability decisions for all configured actions.
 *
 * Actions with a capability start as `loading` until checks complete.
 * @param controller
 */
function buildInitialDecisions(
	controller: ResourceDataViewController<unknown, unknown>
): Map<string, ActionDecision> {
	const map = new Map<string, ActionDecision>();
	const actions = controller.config.actions ?? [];
	actions.forEach((action) => {
		if (action.capability) {
			map.set(action.id, {
				allowed: false,
				loading: true,
				reason: 'pending',
			});
			return;
		}
		map.set(action.id, { allowed: true, loading: false });
	});
	return map;
}

/**
 * Resolve capability decisions for each action using the runtime's capability API.
 *
 * Supports:
 * - missing runtime: marks capability-gated actions as denied (runtime-missing),
 * - sync `can()` return,
 * - async `can()` returning a Promise.
 *
 * Emits normalized diagnostics on failure.
 * @param controller
 * @param reporter
 */
function useActionDecisions(
	controller: ResourceDataViewController<unknown, unknown>,
	reporter: Reporter
): Map<string, ActionDecision> {
	const [decisions, setDecisions] = useState<Map<string, ActionDecision>>(
		() => buildInitialDecisions(controller)
	);

	useEffect(() => {
		let cancelled = false;
		const actions = controller.config.actions ?? [];
		const capabilityRuntime = controller.capabilities?.capability;
		const can = capabilityRuntime?.can as
			| ((key: string, ...args: unknown[]) => boolean | Promise<boolean>)
			| undefined;

		if (!can) {
			const next = new Map<string, ActionDecision>();
			actions.forEach((action) => {
				if (action.capability) {
					next.set(action.id, {
						allowed: false,
						loading: false,
						reason: 'runtime-missing',
					});
				} else {
					next.set(action.id, { allowed: true, loading: false });
				}
			});
			setDecisions(next);
			return () => {
				cancelled = true;
			};
		}

		const next = new Map<string, ActionDecision>();
		actions.forEach((action) => {
			if (!action.capability) {
				next.set(action.id, { allowed: true, loading: false });
				return;
			}

			try {
				const result = can(action.capability);
				if (result instanceof Promise) {
					next.set(action.id, { allowed: false, loading: true });
					result
						.then((value) => {
							if (cancelled) {
								return;
							}
							setDecisions((prev) => {
								const updated = new Map(prev);
								updated.set(action.id, {
									allowed: Boolean(value),
									loading: false,
									reason: Boolean(value)
										? undefined
										: 'forbidden',
								});
								return updated;
							});
						})
						.catch((error) => {
							if (cancelled) {
								return;
							}
							const normalized = normalizeActionCapabilityError(
								error,
								reporter,
								{
									capability: action.capability!,
									resource: controller.resourceName,
								},
								'warn'
							);
							setDecisions((prev) => {
								const updated = new Map(prev);
								updated.set(action.id, {
									allowed: false,
									loading: false,
									reason: 'error',
									error: normalized,
								});
								return updated;
							});
						});
					return;
				}

				next.set(action.id, {
					allowed: Boolean(result),
					loading: false,
					reason: Boolean(result) ? undefined : 'forbidden',
				});
			} catch (error) {
				const normalized = normalizeActionCapabilityError(
					error,
					reporter,
					{
						capability: action.capability!,
						resource: controller.resourceName,
					},
					'error'
				);
				next.set(action.id, {
					allowed: false,
					loading: false,
					reason: 'error',
					error: normalized,
				});
			}
		});

		setDecisions(next);

		return () => {
			cancelled = true;
		};
	}, [
		controller,
		controller.config.actions,
		controller.capabilities,
		reporter,
	]);

	return decisions;
}

/**
 * Decide if an action should render at all in the DataViews toolbar.
 *
 * When `disabledWhenDenied` is truthy, an unauthorized action renders as disabled.
 * Otherwise, denied actions are omitted once decisions settle.
 * @param decision
 * @param actionConfig
 */
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

/**
 * Derive stable string identifiers from selected items.
 *
 * Filters out falsy/empty values.
 * @param selectedItems
 * @param getItemId
 */
function getSelectionIdentifiers<TItem>(
	selectedItems: TItem[],
	getItemId: (item: TItem) => string
): string[] {
	return selectedItems
		.map((item) => getItemId(item))
		.map((id) => (id === undefined || id === null ? '' : String(id)))
		.filter((id) => id !== '');
}

/**
 * Apply cache invalidation patterns via both controller and resource helpers.
 * @param controller
 * @param patterns
 */
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

/**
 * Handle cache invalidation after a successful action.
 *
 * Precedence:
 * - explicit `invalidateOnSuccess` return value,
 * - otherwise invalidate the default list key when available.
 * @param controller
 * @param actionConfig
 * @param result
 * @param context
 * @param context.selection
 * @param context.items
 * @param context.input
 */
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

/**
 * Build the concrete callback wiring a ResourceDataView action to:
 * - capability guards,
 * - selection validation,
 * - action execution,
 * - cache invalidation,
 * - analytics/events,
 * - notices,
 * - normalized error propagation.
 * @param controller
 * @param actionConfig
 * @param getItemId
 * @param decision
 * @param reporter
 * @param notices
 */
function createActionCallback<TItem, TQuery>(
	controller: ResourceDataViewController<TItem, TQuery>,
	actionConfig: ResourceDataViewActionConfig<TItem, unknown, unknown>,
	getItemId: (item: TItem) => string,
	decision: ActionDecision,
	reporter: Reporter,
	notices: NoticeHandlers
): DataViewsActionCallback<TItem> {
	function handleCapabilityPending(selectionIds: string[]): void {
		controller.emitAction({
			actionId: actionConfig.id,
			selection: selectionIds,
			permitted: false,
			reason: 'capability-pending',
		});
		emitPermissionEvent(
			controller,
			actionConfig.id,
			actionConfig.capability,
			selectionIds,
			'pending'
		);
	}

	function handleCapabilityDenied(selectionIds: string[]): void {
		const reason = determineDeniedReason(decision);
		const error = decision.reason === 'error' ? decision.error : undefined;
		emitPermissionEvent(
			controller,
			actionConfig.id,
			actionConfig.capability,
			selectionIds,
			reason,
			error
		);
		controller.emitAction({
			actionId: actionConfig.id,
			selection: selectionIds,
			permitted: false,
			reason: 'capability-denied',
		});
		reporter.warn?.('DataViews action blocked by capability', {
			actionId: actionConfig.id,
			selection: selectionIds,
		});
	}

	function handleEmptySelection(selectionIds: string[]): void {
		controller.emitAction({
			actionId: actionConfig.id,
			selection: selectionIds,
			permitted: false,
			reason: 'empty-selection',
		});
	}

	async function executeAction(
		selectionIds: string[],
		selectedItems: TItem[],
		input: unknown,
		actionLabel: string,
		context: DataViewsActionContext<TItem>
	): Promise<void> {
		try {
			const result = await actionConfig.action(input as never);

			applyInvalidate(controller, actionConfig as never, result, {
				selection: selectionIds,
				items: selectedItems,
				input,
			});

			controller.emitAction({
				actionId: actionConfig.id,
				selection: selectionIds,
				permitted: true,
				meta: actionConfig.buildMeta?.({
					selection: selectionIds,
					items: selectedItems,
				}),
			});

			reporter.info?.('DataViews action completed', {
				actionId: actionConfig.id,
				resource: controller.resourceName,
				selection: selectionIds,
			});

			context.onActionPerformed?.(selectedItems);

			const successMessage = formatActionSuccessMessage(
				actionLabel,
				selectionIds.length
			);
			notices.success(successMessage, {
				id: `wp-kernel/dataviews/${controller.resourceName}/${actionConfig.id}/success`,
			});
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

			reporter.error?.('DataViews action failed', {
				actionId: actionConfig.id,
				resource: controller.resourceName,
				selection: selectionIds,
				error: normalized,
			});

			const failureMessage = `“${actionLabel}” - ${__(
				'failed:',
				'wpkernel'
			)} ${normalized.message}`;
			notices.error(failureMessage, {
				id: `wp-kernel/dataviews/${controller.resourceName}/${actionConfig.id}/failure`,
			});

			throw normalized;
		}
	}

	return async (
		selectedItems: TItem[],
		context: DataViewsActionContext<TItem>
	) => {
		const selectionIds = getSelectionIdentifiers(selectedItems, getItemId);
		const actionLabel = resolveActionLabel(actionConfig);

		if (decision.loading) {
			return handleCapabilityPending(selectionIds);
		}

		if (!decision.allowed) {
			return handleCapabilityDenied(selectionIds);
		}

		if (selectionIds.length === 0) {
			return handleEmptySelection(selectionIds);
		}

		const input = actionConfig.getActionArgs({
			selection: selectionIds,
			items: selectedItems,
		}) as unknown;

		await executeAction(
			selectionIds,
			selectedItems,
			input,
			actionLabel,
			context
		);
	};
}

/**
 * Build DataViews actions from a resource controller.
 *
 * Wires capability checks, cache invalidation, analytics, and core/notices
 * into the `@wordpress/dataviews` action model.
 *
 * @param     controller
 * @param     getItemId
 * @param     runtime
 * @typeParam TItem  Resource item type.
 * @typeParam TQuery Query shape used by the controller.
 * @category DataViews Integration
 * @example
 * ```ts
 * const [view] = useStableView(controller, initialView);
 * const actions = useDataViewActions(controller, (item) => String(item.id), runtime);
 *
 * return (
 *   <DataViews
 *     view={view}
 *     actions={actions}
 *     //...
 *   />
 * );
 * ```
 */
export function useDataViewActions<TItem, TQuery>(
	controller: ResourceDataViewController<TItem, TQuery>,
	getItemId: (item: TItem) => string,
	runtime: DataViewsRuntimeContext
): DataViewAction<TItem>[] {
	const reporter = useMemo(() => {
		const fromController =
			typeof controller.getReporter === 'function'
				? controller.getReporter()
				: undefined;

		return fromController ?? runtime.reporter ?? createNoopReporter();
	}, [controller, runtime.reporter]);

	const decisions = useActionDecisions(
		controller as ResourceDataViewController<unknown, unknown>,
		reporter
	);

	const notices = useMemo(
		() => resolveNoticeHandlers(runtime.registry, reporter),
		[runtime.registry, reporter]
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
				decision,
				reporter,
				notices
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
	}, [controller, decisions, getItemId, notices, reporter]);
}
