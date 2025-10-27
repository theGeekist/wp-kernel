import {
	KernelError,
	WPK_EXIT_CODES,
	serializeKernelError,
	type WPKExitCode,
	type SerializedError,
} from '@wpkernel/core/contracts';
import type { Reporter } from '@wpkernel/core/reporter';

export function determineExitCode(error: unknown): WPKExitCode {
	if (KernelError.isKernelError(error)) {
		if (error.code === 'ValidationError') {
			return WPK_EXIT_CODES.VALIDATION_ERROR;
		}

		/* istanbul ignore next - default exit path */
		return WPK_EXIT_CODES.UNEXPECTED_ERROR;
	}

	return WPK_EXIT_CODES.UNEXPECTED_ERROR;
}

export function reportFailure(
	reporter: Reporter,
	message: string,
	error: unknown
): void {
	reporter.error(message, serialiseError(error));
}

export function serialiseError(error: unknown): SerializedError {
	if (KernelError.isKernelError(error)) {
		return serializeKernelError(error);
	}

	if (error instanceof Error) {
		return serializeKernelError(KernelError.wrap(error));
	}

	/* istanbul ignore next - serialise arbitrary error shapes */
	return serializeKernelError(
		new KernelError('UnknownError', {
			message: 'Unexpected error occurred.',
			data: { value: error },
		})
	);
}
