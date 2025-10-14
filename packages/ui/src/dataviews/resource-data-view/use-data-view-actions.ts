import { useEffect, useMemo, useState } from 'react';
import type {
	Action as DataViewAction,
	ActionButton,
} from '@wordpress/dataviews';
import type { CacheKeyPattern } from '@wpkernel/core/resource';
import { normalizeActionError } from '../error-utils';
import type {
	ResourceDataViewActionConfig,
	ResourceDataViewController,
} from '../types';

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
				if (action.policy) {
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
	}, [controller, controller.config.actions, controller.policies]);

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

export function useDataViewActions<TItem, TQuery>(
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
