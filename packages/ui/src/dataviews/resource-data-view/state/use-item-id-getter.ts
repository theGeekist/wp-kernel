import { useCallback } from 'react';
import type { ResourceDataViewConfig } from '../../types';

export function useItemIdGetter<TItem, TQuery>(
	config: ResourceDataViewConfig<TItem, TQuery>
) {
	return useCallback(
		(item: TItem) => {
			const fromConfig = config.getItemId?.(item);
			if (
				typeof fromConfig === 'string' ||
				typeof fromConfig === 'number'
			) {
				return String(fromConfig);
			}

			const fallback = (item as unknown as { id?: string | number }).id;
			if (typeof fallback === 'undefined') {
				return '';
			}

			return String(fallback);
		},
		[config]
	);
}
