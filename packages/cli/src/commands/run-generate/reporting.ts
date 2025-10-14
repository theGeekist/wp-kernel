import {
	KernelError,
	serializeKernelError,
	type SerializedError,
} from '@wpkernel/core/contracts';
import type { Reporter } from '@wpkernel/core/reporter';

export function reportError(
	reporter: Reporter,
	message: string,
	error: unknown,
	channel: 'adapter' | 'printer' | 'runtime' = 'runtime'
): void {
	reporter.child(channel).error(message, serialiseError(error));
}

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
