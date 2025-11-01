import { WPKernelError } from '@wpkernel/core/error';
import type { ErrorCode } from '@wpkernel/core/error';
import type { Reporter } from '@wpkernel/core/reporter';

interface ListErrorContext {
	resource: string;
	query: unknown;
}

interface CapabilityErrorContext {
	resource: string;
	capability: string;
}

function wrapUnknown(
	value: unknown,
	code: ErrorCode,
	message: string,
	context: Record<string, unknown>
): WPKernelError {
	if (value instanceof Error) {
		return WPKernelError.wrap(value, code, context);
	}

	return new WPKernelError(code, {
		message,
		data: { value },
		context,
	});
}

export function normalizeListError(
	value: unknown,
	reporter: Reporter,
	context: ListErrorContext
): WPKernelError {
	if (WPKernelError.isWPKernelError(value)) {
		reporter.error?.('DataViews list fetch failed', {
			error: value,
			query: context.query,
			resource: context.resource,
		});
		return value;
	}

	const normalized = wrapUnknown(
		value,
		'TransportError',
		'Failed to load resource list data',
		{
			resourceName: context.resource,
		}
	);

	reporter.error?.('DataViews list fetch failed', {
		error: normalized,
		query: context.query,
		resource: context.resource,
	});

	return normalized;
}

export function normalizeCapabilityError(
	value: unknown,
	reporter: Reporter,
	context: CapabilityErrorContext
): WPKernelError {
	if (WPKernelError.isWPKernelError(value)) {
		reporter.error?.(
			'Capability evaluation failed for DataViews menu access',
			{
				error: value,
				capability: context.capability,
				resource: context.resource,
			}
		);
		return value;
	}

	const normalized = wrapUnknown(
		value,
		'CapabilityDenied',
		'Failed to evaluate capability for DataViews menu access',
		{
			resourceName: context.resource,
			capability: context.capability,
		}
	);

	reporter.error?.('Capability evaluation failed for DataViews menu access', {
		error: normalized,
		capability: context.capability,
		resource: context.resource,
	});

	return normalized;
}
