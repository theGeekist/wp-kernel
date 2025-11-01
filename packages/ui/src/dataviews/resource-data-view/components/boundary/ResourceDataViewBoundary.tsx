/* @jsxImportSource react */
import type { ReactNode } from 'react';
import type { ListResultState, PermissionState } from '../../types/state';
import { LoadingState } from './LoadingState';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { PermissionDeniedState } from './PermissionDeniedState';

interface ResourceDataViewBoundaryProps<TItem> {
	readonly list: ListResultState<TItem>;
	readonly items: TItem[];
	readonly permission: PermissionState;
	readonly emptyState?: ReactNode;
	readonly children: ReactNode;
}

function hasItems<TItem>(items: TItem[] | undefined): boolean {
	return Boolean(items && items.length > 0);
}

function shouldShowLoading<TItem>(
	list: ListResultState<TItem>,
	permission: PermissionState,
	items: TItem[]
): boolean {
	if (permission.status === 'checking') {
		return !hasItems(items);
	}

	if (list.status !== 'loading') {
		return false;
	}

	return !hasItems(items);
}

function shouldShowEmpty<TItem>(
	list: ListResultState<TItem>,
	items: TItem[]
): boolean {
	if (list.status !== 'success') {
		return false;
	}

	return !hasItems(items);
}

export function ResourceDataViewBoundary<TItem>({
	list,
	items,
	permission,
	emptyState,
	children,
}: ResourceDataViewBoundaryProps<TItem>) {
	if (permission.status === 'denied') {
		return <PermissionDeniedState permission={permission} />;
	}

	if (list.status === 'error') {
		return <ErrorState error={list.error} />;
	}

	if (shouldShowLoading(list, permission, items)) {
		return <LoadingState />;
	}

	if (shouldShowEmpty(list, items)) {
		return <EmptyState empty={emptyState} />;
	}

	return <>{children}</>;
}
