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

export interface HandleFailureOptions {
	readonly includeContext?: boolean;
}

export function handleFailure(
	error: unknown,
	reporter: Reporter,
	defaultExitCode: WPKExitCode,
	options: HandleFailureOptions = {}
): WPKExitCode {
	if (WPKernelError.isWPKernelError(error)) {
		const payload = serializeWPKernelError(error);
		emitFatalError(error.message, payload);
		reporter.error(error.message);
		if (options.includeContext) {
			reporter.error('Error context', payload);
		} else {
			reporter.debug('Error context', payload);
		}

		if (VALIDATION_EXIT_CODES.has(error.code)) {
			return WPK_EXIT_CODES.VALIDATION_ERROR;
		}

		return defaultExitCode;
	}

	const payload = { error: serialiseError(error) };
	emitFatalError('Unexpected error while running generate command.', payload);
	reporter.error('Unexpected error while running generate command.');
	if (options.includeContext) {
		reporter.error('Error context', payload);
	} else {
		reporter.debug('Error context', payload);
	}

	return defaultExitCode;
}
