import { WPKernelError } from '../../error/WPKernelError';
import type {
	ActionErrorEvent,
	ReduxMiddleware,
	ActionLifecycleEvent,
} from '../../actions/types';
import type { Reporter } from '../../reporter';
import type { WPKernelRegistry } from '../types';
import { WPK_EVENTS } from '../../contracts/index.js';
import type { WPKernelEventBus, WPKernelEventMap } from '../../events/bus';

export type NoticeStatus = 'success' | 'info' | 'warning' | 'error';

export type WPKernelEventsPluginOptions = {
	reporter?: Reporter;
	registry?: WPKernelRegistry;
	events: WPKernelEventBus;
};

type NoticesDispatch = {
	createNotice: (
		status: NoticeStatus,
		content: string,
		options?: Record<string, unknown>
	) => void;
};

type WordPressHooks = {
	addAction?: (
		hookName: string,
		namespace: string,
		callback: (payload: ActionErrorEvent) => void,
		priority?: number
	) => void;
	removeAction?: (hookName: string, namespace: string) => void;
	doAction?: (hookName: string, ...args: unknown[]) => void;
};

type KernelReduxMiddleware<TState = unknown> = {
	destroy?: () => void;
} & ReduxMiddleware<TState>;

function getHooks(): WordPressHooks | null {
	if (typeof window === 'undefined') {
		return null;
	}

	const wp = (window as Window & { wp?: { hooks?: WordPressHooks } }).wp;
	return wp?.hooks ?? null;
}

function getNoticesDispatch(
	registry: WPKernelRegistry | undefined
): NoticesDispatch | null {
	if (!registry || typeof registry.dispatch !== 'function') {
		return null;
	}

	try {
		const dispatch = registry.dispatch('core/notices') as unknown;
		if (
			!dispatch ||
			typeof (dispatch as NoticesDispatch).createNotice !== 'function'
		) {
			return null;
		}
		return dispatch as NoticesDispatch;
	} catch (_error) {
		return null;
	}
}

function mapErrorToStatus(error: unknown): NoticeStatus {
	if (WPKernelError.isWPKernelError(error)) {
		switch (error.code) {
			case 'CapabilityDenied':
				return 'warning';
			case 'ValidationError':
				return 'info';
			default:
				return 'error';
		}
	}

	return 'error';
}

function resolveErrorMessage(error: unknown): string {
	if (WPKernelError.isWPKernelError(error)) {
		return error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	if (typeof error === 'string') {
		return error;
	}

	return 'An unexpected error occurred';
}

export function wpkEventsPlugin({
	reporter,
	registry,
	events,
}: WPKernelEventsPluginOptions): KernelReduxMiddleware {
	const hooks = getHooks();

	const detachListeners: Array<() => void> = [];

	const middleware: KernelReduxMiddleware = () => {
		const hookMap: Partial<Record<keyof WPKernelEventMap, string>> = {
			'action:start': WPK_EVENTS.ACTION_START,
			'action:complete': WPK_EVENTS.ACTION_COMPLETE,
			'action:error': WPK_EVENTS.ACTION_ERROR,
			'cache:invalidated': WPK_EVENTS.CACHE_INVALIDATED,
		};

		const emitToHooks = <K extends keyof WPKernelEventMap>(
			event: K,
			payload: WPKernelEventMap[K]
		) => {
			if (event === 'action:domain' || event === 'custom:event') {
				const domainPayload = payload as {
					eventName: string;
					payload: unknown;
				};
				hooks?.doAction?.(
					domainPayload.eventName,
					domainPayload.payload
				);
				return;
			}

			const hookName = hookMap[event];
			if (hookName) {
				hooks?.doAction?.(hookName, payload);
			}
		};

		const register = <K extends keyof WPKernelEventMap>(
			eventName: K,
			handler: (payload: WPKernelEventMap[K]) => void
		) => {
			detachListeners.push(events.on(eventName, handler));
		};

		register('action:error', (event) => {
			const errorEvent = event as ActionErrorEvent;
			const message = resolveErrorMessage(errorEvent.error);
			const status = mapErrorToStatus(errorEvent.error);
			const notices = getNoticesDispatch(registry);

			notices?.createNotice(status, message, {
				id: errorEvent.requestId,
				isDismissible: true,
			});

			reporter?.error(message, {
				action: errorEvent.actionName,
				requestId: errorEvent.requestId,
				namespace: errorEvent.namespace,
				status,
			});

			emitToHooks('action:error', errorEvent);
		});

		register('action:start', (event) => {
			emitToHooks('action:start', event as ActionLifecycleEvent);
		});
		register('action:complete', (event) => {
			emitToHooks('action:complete', event as ActionLifecycleEvent);
		});
		register('cache:invalidated', (event) => {
			emitToHooks('cache:invalidated', event);
		});
		register('action:domain', (event) => {
			emitToHooks('action:domain', event);
		});
		register('custom:event', (event) => {
			emitToHooks('custom:event', event);
		});

		return (next) => (action) => next(action);
	};

	middleware.destroy = () => {
		while (detachListeners.length) {
			const teardown = detachListeners.pop();
			teardown?.();
		}
	};

	return middleware;
}
