import { useCallback, useEffect, useState } from 'react';
import type { View } from '@wordpress/dataviews';
import type { ResourceDataViewController } from '../types';

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

export function useStableView(
	controller: ResourceDataViewController<unknown, unknown>,
	initial: View
): [View, (next: View) => void] {
	const [view, setView] = useState<View>(() =>
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
			.catch((error) => {
				controller
					.getReporter()
					.debug?.('Failed to restore DataViews view state', {
						error,
					});
			});

		return () => {
			active = false;
			controller.emitUnregistered(controller.preferencesKey);
		};
	}, [controller]);

	useEffect(() => {
		setView(mergeViewWithDefaults(controller.config.defaultView, initial));
	}, [controller, initial]);

	const updateView = useCallback(
		(next: View) => {
			const normalized = mergeViewWithDefaults(
				controller.config.defaultView,
				next
			);
			setView(normalized);
			controller.saveView(normalized).catch((error) => {
				controller
					.getReporter()
					.warn?.('Failed to persist DataViews view state', {
						error,
					});
			});
			controller.emitViewChange(normalized);
		},
		[controller]
	);

	return [view, updateView];
}
