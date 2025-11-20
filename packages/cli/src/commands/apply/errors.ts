import {
	WPKernelError,
	WPK_EXIT_CODES,
	serializeWPKernelError,
	type WPKExitCode,
	type SerializedError,
} from '@wpkernel/core/contracts';
import type { Reporter } from '@wpkernel/core/reporter';
import { emitFatalError } from '../fatal';

export function determineExitCode(error: unknown): WPKExitCode {
	if (WPKernelError.isWPKernelError(error)) {
		if (error.code === 'ValidationError') {
			return WPK_EXIT_CODES.VALIDATION_ERROR;
		}

		/* istanbul ignore next - default exit path */
		return WPK_EXIT_CODES.UNEXPECTED_ERROR;
	}

	return WPK_EXIT_CODES.UNEXPECTED_ERROR;
}

export interface ReportFailureOptions {
	readonly includeContext?: boolean;
}

export function reportFailure(
	reporter: Reporter,
	message: string,
	error: unknown,
	options: ReportFailureOptions = {}
): void {
	const payload = serialiseError(error);
	const isValidation =
		WPKernelError.isWPKernelError(error) &&
		error.code === 'ValidationError';

	if (isValidation) {
		reporter.warn(message);
		if (options.includeContext) {
			reporter.debug('Error context', payload);
		}
		return;
	}

	emitFatalError(message, {
		context: options.includeContext ? payload : undefined,
		reporter,
	});
	if (!options.includeContext) {
		reporter.debug('Error context', payload);
	}
}

export function serialiseError(error: unknown): SerializedError {
	if (WPKernelError.isWPKernelError(error)) {
		return serializeWPKernelError(error);
	}

	if (error instanceof Error) {
		return serializeWPKernelError(WPKernelError.wrap(error));
	}

	/* istanbul ignore next - serialise arbitrary error shapes */
	return serializeWPKernelError(
		new WPKernelError('UnknownError', {
			message: 'Unexpected error occurred.',
			data: { value: error },
		})
	);
}
