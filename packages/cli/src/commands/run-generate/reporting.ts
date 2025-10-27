import {
	WPKernelError,
	serializeWPKernelError,
	type SerializedError,
} from '@wpkernel/core/contracts';
import type { Reporter } from '@wpkernel/core/reporter';

export function reportError(
	reporter: Reporter,
	message: string,
	error: unknown,
	channel: 'adapter' | 'builder' | 'runtime' = 'runtime'
): void {
	reporter.child(channel).error(message, serialiseError(error));
}

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
