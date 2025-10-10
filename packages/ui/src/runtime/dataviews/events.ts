import type { KernelInstance } from '@geekist/wp-kernel/data';
import type { Reporter } from '@geekist/wp-kernel/reporter';

export const DATA_VIEWS_EVENT_PREFIX = 'ui:dataviews';
export const DATA_VIEWS_EVENT_REGISTERED = `${DATA_VIEWS_EVENT_PREFIX}:registered`;
export const DATA_VIEWS_EVENT_UNREGISTERED = `${DATA_VIEWS_EVENT_PREFIX}:unregistered`;
export const DATA_VIEWS_EVENT_VIEW_CHANGED = `${DATA_VIEWS_EVENT_PREFIX}:view-changed`;
export const DATA_VIEWS_EVENT_ACTION_TRIGGERED = `${DATA_VIEWS_EVENT_PREFIX}:action-triggered`;

export type DataViewRegisteredPayload = {
	resource: string;
	preferencesKey: string;
};

export type DataViewChangedPayload = {
	resource: string;
	viewState: {
		fields: string[];
		sort?: { field: string; direction: 'asc' | 'desc' };
		search?: string;
		filters?: Record<string, unknown>;
		page: number;
		perPage: number;
	};
};

export type DataViewActionTriggeredPayload = {
	resource: string;
	actionId: string;
	selection: Array<string | number>;
	meta?: Record<string, unknown>;
	permitted: boolean;
	reason?: string;
};

export interface DataViewsEventEmitter {
	registered: (payload: DataViewRegisteredPayload) => void;
	unregistered: (payload: DataViewRegisteredPayload) => void;
	viewChanged: (payload: DataViewChangedPayload) => void;
	actionTriggered: (payload: DataViewActionTriggeredPayload) => void;
}

function emitEvent(
	kernel: KernelInstance,
	reporter: Reporter,
	eventName: string,
	payload:
		| DataViewRegisteredPayload
		| DataViewChangedPayload
		| DataViewActionTriggeredPayload
): void {
	try {
		kernel.emit(eventName, payload);
		reporter.debug('Emitted DataViews event', {
			event: eventName,
			resource: 'resource' in payload ? payload.resource : undefined,
		});
	} catch (error) {
		reporter.error('Failed to emit DataViews event', {
			event: eventName,
			error,
		});
	}
}

export function createDataViewsEventEmitter(
	kernel: KernelInstance,
	reporter: Reporter
): DataViewsEventEmitter {
	return {
		registered(payload) {
			emitEvent(kernel, reporter, DATA_VIEWS_EVENT_REGISTERED, payload);
		},
		unregistered(payload) {
			emitEvent(kernel, reporter, DATA_VIEWS_EVENT_UNREGISTERED, payload);
		},
		viewChanged(payload) {
			emitEvent(kernel, reporter, DATA_VIEWS_EVENT_VIEW_CHANGED, payload);
		},
		actionTriggered(payload) {
			emitEvent(
				kernel,
				reporter,
				DATA_VIEWS_EVENT_ACTION_TRIGGERED,
				payload
			);
		},
	};
}
