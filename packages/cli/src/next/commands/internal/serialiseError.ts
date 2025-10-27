import {
	WPKernelError,
	serializeWPKernelError,
	type SerializedError,
} from '@wpkernel/core/contracts';

export function serialiseError(error: unknown): SerializedError {
	if (WPKernelError.isWPKernelError(error)) {
		return serializeWPKernelError(error);
	}

	if (error instanceof Error) {
		return serializeWPKernelError(WPKernelError.wrap(error));
	}

	return serializeWPKernelError(
		new WPKernelError('UnknownError', {
			message: 'Unexpected error occurred.',
			data: { value: error },
		})
	);
}
