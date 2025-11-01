import { useMemo } from 'react';
import type { View } from '@wordpress/dataviews';
import type { ResourceDataViewController } from '../../types';
import { useStableView } from '../use-stable-view';

type UseViewStateResult<TItem, TQuery> = {
	view: View;
	setView: ReturnType<typeof useStableView>[1];
	viewState: ReturnType<
		ResourceDataViewController<TItem, TQuery>['deriveViewState']
	>;
};

export function useViewState<TItem, TQuery>(
	controller: ResourceDataViewController<TItem, TQuery>
): UseViewStateResult<TItem, TQuery> {
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

	return {
		view,
		setView,
		viewState,
	};
}
