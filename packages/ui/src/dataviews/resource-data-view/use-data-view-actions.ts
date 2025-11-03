import { useEffect, useMemo, useState } from 'react';
import type {
	Action as DataViewAction,
	ActionButton,
} from '@wordpress/dataviews';
import { __ } from '@wordpress/i18n';
import type { CacheKeyPattern } from '@wpkernel/core/resource';
import type { Reporter } from '@wpkernel/core/reporter';
import { createNoopReporter } from '@wpkernel/core/reporter';
import { normalizeActionError } from '../error-utils';
import type {
	ResourceDataViewActionConfig,
	ResourceDataViewController,
	DataViewsRuntimeContext,
} from '../types';
import { formatActionSuccessMessage } from './i18n';

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

type NoticeOptions = {
	readonly id?: string;
};

type NoticeHandlers = {
	success: (message: string, options?: NoticeOptions) => void;
	error: (message: string, options?: NoticeOptions) => void;
};

const noopNotice = () => {
	// Intentionally empty
};

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

function resolveActionLabel<TItem>(
	actionConfig: ResourceDataViewActionConfig<TItem, unknown, unknown>
): string {
	if (typeof actionConfig.label === 'string') {
		return actionConfig.label;
	}
	return actionConfig.id;
}

function buildInitialDecisions(
	controller: ResourceDataViewController<unknown, unknown>
): Map<string, ActionDecision> {
	const map = new Map<string, ActionDecision>();
	const actions = controller.config.actions ?? [];
	actions.forEach((action) => {
		if (action.capability) {
			map.set(action.id, { allowed: false, loading: true });
			return;
		}
		map.set(action.id, { allowed: true, loading: false });
	});
	return map;
}

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
					next.set(action.id, { allowed: false, loading: false });
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
								});
								return updated;
							});
						})
						.catch((error) => {
							if (cancelled) {
								return;
							}
							reporter.warn?.(
								'Capability evaluation failed for DataViews action',
								{
									error,
									capability: action.capability,
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
				reporter.error?.('Capability evaluation threw an error', {
					error,
					capability: action.capability,
				});
				next.set(action.id, { allowed: false, loading: false });
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
	decision: ActionDecision,
	reporter: Reporter,
	notices: NoticeHandlers
): DataViewsActionCallback<TItem> {
	return async (
		selectedItems: TItem[],
		context: DataViewsActionContext<TItem>
	) => {
		const selectionIds = getSelectionIdentifiers(selectedItems, getItemId);
		const actionLabel = resolveActionLabel(actionConfig);

		if (decision.loading) {
			controller.emitAction({
				actionId: actionConfig.id,
				selection: selectionIds,
				permitted: false,
				reason: 'capability-pending',
			});
			return;
		}

		if (!decision.allowed) {
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
			const successNoticeId = `wp-kernel/dataviews/${controller.resourceName}/${actionConfig.id}/success`;
			notices.success(successMessage, {
				id: successNoticeId,
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
			const failureMessage = `“${actionLabel}” — ${__(
				'failed:',
				'wpkernel'
			)} ${normalized.message}`;
			const failureNoticeId = `wp-kernel/dataviews/${controller.resourceName}/${actionConfig.id}/failure`;
			notices.error(failureMessage, {
				id: failureNoticeId,
			});
			throw normalized;
		}
	};
}

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
