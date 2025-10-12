import { KernelError } from '@geekist/wp-kernel/error';
import type { Reporter } from '@geekist/wp-kernel';

export function reportError(
	reporter: Reporter,
	message: string,
	error: unknown,
	channel: 'adapter' | 'printer' | 'runtime' = 'runtime'
): void {
	reporter.child(channel).error(message, serialiseError(error));
}

export function serialiseError(error: unknown): Record<string, unknown> {
	if (KernelError.isKernelError(error)) {
		return {
			code: error.code,
			message: error.message,
			context: error.context,
			data: error.data,
		};
	}

	if (error instanceof Error) {
		return {
			name: error.name,
			message: error.message,
			stack: error.stack,
		};
	}

	return { value: error };
}
