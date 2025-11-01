import type { WPKernelError } from '@wpkernel/core/error';
import type { ListResponse } from '@wpkernel/core/resource';

export type ListStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ListResultState<TItem> {
	readonly data?: ListResponse<TItem>;
	readonly status: ListStatus;
	readonly isLoading: boolean;
	readonly error?: WPKernelError;
}

export type PermissionStatus = 'allowed' | 'checking' | 'denied' | 'unknown';

export interface PermissionState {
	readonly status: PermissionStatus;
	readonly capability?: string;
	readonly error?: WPKernelError;
}
