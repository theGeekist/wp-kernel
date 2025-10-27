import {
	KernelError,
	serializeKernelError,
	type SerializedError,
} from '@wpkernel/core/contracts';

export function serialiseError(error: unknown): SerializedError {
	if (KernelError.isKernelError(error)) {
		return serializeKernelError(error);
	}

	if (error instanceof Error) {
		return serializeKernelError(KernelError.wrap(error));
	}

	return serializeKernelError(
		new KernelError('UnknownError', {
			message: 'Unexpected error occurred.',
			data: { value: error },
		})
	);
}
