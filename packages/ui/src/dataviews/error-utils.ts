import { WPKernelError } from '@wpkernel/core/error';
import type { Reporter } from '@wpkernel/core/reporter';
import { DataViewsActionError } from '../runtime/dataviews/errors';

interface ErrorContext {
	actionId: string;
	resource: string;
	selection?: Array<string | number>;
}

function createValidationError(
	error: WPKernelError,
	context: ErrorContext
): WPKernelError {
	return new DataViewsActionError(error.message, {
		actionId: context.actionId,
		resource: context.resource,
		selection: context.selection,
		original: error,
	});
}

function createCapabilityDeniedError(
	error: WPKernelError,
	context: ErrorContext
): WPKernelError {
	return new DataViewsActionError(error.message || 'Action not permitted', {
		actionId: context.actionId,
		resource: context.resource,
		selection: context.selection,
		capabilityKey: error.context?.capabilityKey,
	});
}

function wrapTransportError(
	error: WPKernelError,
	context: ErrorContext
): WPKernelError {
	return WPKernelError.wrap(error, 'TransportError', {
		actionId: context.actionId,
		resourceName: context.resource,
	});
}

function handleWPKernelError(
	error: WPKernelError,
	context: ErrorContext
): WPKernelError {
	switch (error.code) {
		case 'ValidationError':
			return createValidationError(error, context);
		case 'CapabilityDenied':
			return createCapabilityDeniedError(error, context);
		case 'TransportError':
		case 'ServerError':
			return wrapTransportError(error, context);
		default:
			return error;
	}
}

function wrapUnknownError(
	value: unknown,
	context: ErrorContext,
	reporter?: Reporter
): WPKernelError {
	if (value instanceof Error) {
		const wrapped = WPKernelError.wrap(value, 'UnknownError', {
			actionId: context.actionId,
			resourceName: context.resource,
		});
		reporter?.error?.('Unhandled error thrown by DataViews action', {
			error: wrapped,
			selection: context.selection,
		});
		return wrapped;
	}

	const unknown = new WPKernelError('UnknownError', {
		message: 'Action failed with unknown error type',
		data: { value },
		context: {
			actionId: context.actionId,
			resourceName: context.resource,
		},
	});
	reporter?.error?.('DataViews action failed with non-error value', {
		error: unknown,
		selection: context.selection,
	});
	return unknown;
}

export function normalizeActionError(
	error: unknown,
	context: ErrorContext,
	reporter?: Reporter
): WPKernelError {
	if (WPKernelError.isWPKernelError(error)) {
		return handleWPKernelError(error, context);
	}
	return wrapUnknownError(error, context, reporter);
}
