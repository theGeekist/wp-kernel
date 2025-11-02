import {
	WPKernelError,
	WPK_EXIT_CODES,
	type WPKExitCode,
	serializeWPKernelError,
} from '@wpkernel/core/contracts';
import type { Reporter } from '@wpkernel/core/reporter';
import { serialiseError } from './reporting';
import { emitFatalError } from '../fatal';

const VALIDATION_EXIT_CODES = new Set<WPKernelError['code']>([
	'ValidationError',
	'DeveloperError',
]);

export function handleFailure(
	error: unknown,
	reporter: Reporter,
	defaultExitCode: WPKExitCode
): WPKExitCode {
	if (WPKernelError.isWPKernelError(error)) {
		const payload = serializeWPKernelError(error);
		emitFatalError(error.message, payload);
		reporter.error(error.message, payload);

		if (VALIDATION_EXIT_CODES.has(error.code)) {
			return WPK_EXIT_CODES.VALIDATION_ERROR;
		}

		return defaultExitCode;
	}

	const payload = { error: serialiseError(error) };
	emitFatalError('Unexpected error while running generate command.', payload);
	reporter.error('Unexpected error while running generate command.', payload);

	return defaultExitCode;
}
