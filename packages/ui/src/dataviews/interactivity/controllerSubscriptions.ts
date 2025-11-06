import type { View } from '@wordpress/dataviews';
import type { Reporter } from '@wpkernel/core/reporter';
import type { ResourceDataViewController } from '../types';

type ActionPayload = Parameters<
	ResourceDataViewController<unknown, unknown>['emitAction']
>[0];

type ViewSubscription = {
	listeners: Set<(view: View) => void>;
	original: ResourceDataViewController<unknown, unknown>['emitViewChange'];
};

type ActionSubscription = {
	listeners: Set<(payload: ActionPayload) => void>;
	original: ResourceDataViewController<unknown, unknown>['emitAction'];
};

const viewSubscriptions = new WeakMap<
	ResourceDataViewController<unknown, unknown>,
	ViewSubscription
>();

const actionSubscriptions = new WeakMap<
	ResourceDataViewController<unknown, unknown>,
	ActionSubscription
>();

export function subscribeToViewChange<TItem, TQuery>(
	controller: ResourceDataViewController<TItem, TQuery>,
	reporter: Reporter,
	listener: (view: View) => void
): () => void {
	type Controller = ResourceDataViewController<unknown, unknown>;
	const castController = controller as Controller;
	let subscription = viewSubscriptions.get(castController);

	if (!subscription) {
		const original = controller.emitViewChange;
		const listeners = new Set<(view: View) => void>();

		controller.emitViewChange = (view: View) => {
			listeners.forEach((handler) => {
				try {
					handler(view);
				} catch (error) {
					reporter.error?.(
						'Failed to process DataView interaction view change listener',
						{
							resource: controller.resourceName,
							error,
						}
					);
				}
			});
			original.call(controller, view);
		};

		subscription = { listeners, original };
		viewSubscriptions.set(castController, subscription);
	}

	subscription.listeners.add(listener);

	return () => {
		const current = viewSubscriptions.get(castController);
		if (!current) {
			return;
		}

		current.listeners.delete(listener);

		if (current.listeners.size === 0) {
			controller.emitViewChange =
				current.original as ResourceDataViewController<
					TItem,
					TQuery
				>['emitViewChange'];
			viewSubscriptions.delete(castController);
		}
	};
}

export function subscribeToAction<TItem, TQuery>(
	controller: ResourceDataViewController<TItem, TQuery>,
	reporter: Reporter,
	listener: (payload: ActionPayload) => void
): () => void {
	type Controller = ResourceDataViewController<unknown, unknown>;
	const castController = controller as Controller;
	let subscription = actionSubscriptions.get(castController);

	if (!subscription) {
		const original = controller.emitAction;
		const listeners = new Set<(payload: ActionPayload) => void>();

		controller.emitAction = (payload: ActionPayload) => {
			listeners.forEach((handler) => {
				try {
					handler(payload);
				} catch (error) {
					reporter.error?.(
						'Failed to process DataView interaction action listener',
						{
							resource: controller.resourceName,
							error,
						}
					);
				}
			});
			original.call(controller, payload);
		};

		subscription = { listeners, original };
		actionSubscriptions.set(castController, subscription);
	}

	subscription.listeners.add(listener);

	return () => {
		const current = actionSubscriptions.get(castController);
		if (!current) {
			return;
		}

		current.listeners.delete(listener);

		if (current.listeners.size === 0) {
			controller.emitAction =
				current.original as ResourceDataViewController<
					TItem,
					TQuery
				>['emitAction'];
			actionSubscriptions.delete(castController);
		}
	};
}
