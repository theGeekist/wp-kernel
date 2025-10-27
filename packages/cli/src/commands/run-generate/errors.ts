import {
	KernelError,
	WPK_EXIT_CODES,
	type WPKExitCode,
	serializeKernelError,
} from '@wpkernel/core/contracts';
import type { Reporter } from '@wpkernel/core/reporter';
import { serialiseError } from './reporting';

const VALIDATION_EXIT_CODES = new Set<KernelError['code']>([
	'ValidationError',
	'DeveloperError',
]);

export function handleFailure(
	error: unknown,
	reporter: Reporter,
	defaultExitCode: WPKExitCode
): WPKExitCode {
	if (KernelError.isKernelError(error)) {
		reporter.error(error.message, serializeKernelError(error));

		if (VALIDATION_EXIT_CODES.has(error.code)) {
			return WPK_EXIT_CODES.VALIDATION_ERROR;
		}

		return defaultExitCode;
	}

	reporter.error('Unexpected error while running generate command.', {
		error: serialiseError(error),
	});

	return defaultExitCode;
}
