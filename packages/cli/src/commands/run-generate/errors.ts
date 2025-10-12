import { KernelError } from '@geekist/wp-kernel/error';
import type { Reporter } from '@geekist/wp-kernel';
import { serialiseError } from './reporting';
import type { ExitCode } from './types';

export function handleFailure(
	error: unknown,
	reporter: Reporter,
	defaultExitCode: ExitCode
): ExitCode {
	if (KernelError.isKernelError(error)) {
		reporter.error(error.message, error.toJSON());

		if (error.code === 'ValidationError') {
			return 1;
		}

		return defaultExitCode;
	}

	reporter.error('Unexpected error while running generate command.', {
		error: serialiseError(error),
	});

	return defaultExitCode;
}
