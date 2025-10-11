import { KernelError } from '@geekist/wp-kernel/error';
import type { Reporter } from '@geekist/wp-kernel/reporter';
import { DataViewsActionError } from '../runtime/dataviews/errors';

interface ErrorContext {
	actionId: string;
	resource: string;
	selection?: Array<string | number>;
}

function createValidationError(
	error: KernelError,
	context: ErrorContext
): KernelError {
	return new DataViewsActionError(error.message, {
		actionId: context.actionId,
		resource: context.resource,
		selection: context.selection,
		original: error,
	});
}

function createPolicyDeniedError(
	error: KernelError,
	context: ErrorContext
): KernelError {
	return new DataViewsActionError(error.message || 'Action not permitted', {
		actionId: context.actionId,
		resource: context.resource,
		selection: context.selection,
		policyKey: error.context?.policyKey,
	});
}

function wrapTransportError(
	error: KernelError,
	context: ErrorContext
): KernelError {
	return KernelError.wrap(error, 'TransportError', {
		actionId: context.actionId,
		resourceName: context.resource,
	});
}

function handleKernelError(
	error: KernelError,
	context: ErrorContext
): KernelError {
	switch (error.code) {
		case 'ValidationError':
			return createValidationError(error, context);
		case 'PolicyDenied':
			return createPolicyDeniedError(error, context);
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
): KernelError {
	if (value instanceof Error) {
		const wrapped = KernelError.wrap(value, 'UnknownError', {
			actionId: context.actionId,
			resourceName: context.resource,
		});
		reporter?.error?.('Unhandled error thrown by DataViews action', {
			error: wrapped,
			selection: context.selection,
		});
		return wrapped;
	}

	const unknown = new KernelError('UnknownError', {
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
): KernelError {
	if (KernelError.isKernelError(error)) {
		return handleKernelError(error, context);
	}
	return wrapUnknownError(error, context, reporter);
}
