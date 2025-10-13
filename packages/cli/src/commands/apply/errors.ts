import { KernelError } from '@geekist/wp-kernel/error';
import type { Reporter } from '@geekist/wp-kernel/reporter';
import type { SerializedError } from '@geekist/wp-kernel/error';

export function determineExitCode(error: unknown): number {
	if (KernelError.isKernelError(error)) {
		if (error.code === 'ValidationError') {
			return 1;
		}

		/* istanbul ignore next - default exit path */
		return 2;
	}

	return 2;
}

export function reportFailure(
	reporter: Reporter,
	message: string,
	error: unknown
): void {
	reporter.error(message, serialiseError(error));
}

export function serialiseError(
	error: unknown
): SerializedError | Record<string, unknown> {
	if (KernelError.isKernelError(error)) {
		return error.toJSON();
	}

	if (error instanceof Error) {
		return {
			name: error.name,
			message: error.message,
			stack: error.stack,
		};
	}

	/* istanbul ignore next - serialise arbitrary error shapes */
	return { value: error };
}
