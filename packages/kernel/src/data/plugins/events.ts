import { KernelError } from '../../error/KernelError';
import type { ActionErrorEvent, ReduxMiddleware } from '../../actions/types';
import type { Reporter } from '../../reporter';
import type { KernelRegistry } from '../types';
import { WPK_EVENTS } from '../../namespace/constants';
import type { KernelEventBus } from '../../events/bus';
import type { ActionErrorEvent, ActionLifecycleEvent } from '../../actions/types';
import type { KernelEventMap } from '../../events/bus';

export type NoticeStatus = 'success' | 'info' | 'warning' | 'error';

export type KernelEventsPluginOptions = {
        reporter?: Reporter;
        registry?: KernelRegistry;
        events: KernelEventBus;
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
	registry: KernelRegistry | undefined
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
	if (KernelError.isKernelError(error)) {
		switch (error.code) {
			case 'PolicyDenied':
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
	if (KernelError.isKernelError(error)) {
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

export function kernelEventsPlugin({
        reporter,
        registry,
        events,
}: KernelEventsPluginOptions): KernelReduxMiddleware {
        const hooks = getHooks();
        const notices = getNoticesDispatch(registry);

        const detachListeners: Array<() => void> = [];

        const middleware: KernelReduxMiddleware = () => {
                const emitToHooks = <K extends keyof KernelEventMap>(
                        event: K,
                        payload: KernelEventMap[K]
                ) => {
                        switch (event) {
                                case 'action:start':
                                        hooks?.doAction?.(WPK_EVENTS.ACTION_START, payload);
                                        break;
                                case 'action:complete':
                                        hooks?.doAction?.(WPK_EVENTS.ACTION_COMPLETE, payload);
                                        break;
                                case 'action:error':
                                        hooks?.doAction?.(WPK_EVENTS.ACTION_ERROR, payload);
                                        break;
                                case 'cache:invalidated':
                                        hooks?.doAction?.(WPK_EVENTS.CACHE_INVALIDATED, payload);
                                        break;
                                case 'action:domain':
                                case 'custom:event':
                                        hooks?.doAction?.(payload.eventName, payload.payload);
                                        break;
                                default:
                                        break;
                        }
                };

                detachListeners.push(
                        events.on('action:error', (event) => {
                                const errorEvent = event as ActionErrorEvent;
                                const message = resolveErrorMessage(errorEvent.error);
                                const status = mapErrorToStatus(errorEvent.error);

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
                        })
                );

                detachListeners.push(
                        events.on('action:start', (event) => {
                                emitToHooks('action:start', event as ActionLifecycleEvent);
                        })
                );
                detachListeners.push(
                        events.on('action:complete', (event) => {
                                emitToHooks('action:complete', event as ActionLifecycleEvent);
                        })
                );
                detachListeners.push(
                        events.on('cache:invalidated', (event) => {
                                emitToHooks('cache:invalidated', event);
                        })
                );
                detachListeners.push(
                        events.on('action:domain', (event) => {
                                emitToHooks('action:domain', event);
                        })
                );
                detachListeners.push(
                        events.on('custom:event', (event) => {
                                emitToHooks('custom:event', event);
                        })
                );
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
