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
	const includeContext = Boolean(options.includeContext);

	if (!WPKernelError.isWPKernelError(error)) {
		return handleUnexpectedError(
			error,
			reporter,
			defaultExitCode,
			includeContext
		);
	}

	return handleKnownError(error, reporter, defaultExitCode, includeContext);
}

function handleKnownError(
	error: WPKernelError,
	reporter: Reporter,
	defaultExitCode: WPKExitCode,
	includeContext: boolean
): WPKExitCode {
	const payload = serializeWPKernelError(error);
	if (error.code === 'ValidationError') {
		reporter.warn(error.message);
		if (includeContext) {
			reporter.debug('Error context', payload);
		}
	} else {
		emitFatalError(error.message, {
			context: includeContext ? payload : undefined,
			reporter,
		});
		if (!includeContext) {
			reporter.debug('Error context', payload);
		}
	}

	if (VALIDATION_EXIT_CODES.has(error.code)) {
		return WPK_EXIT_CODES.VALIDATION_ERROR;
	}

	return defaultExitCode;
}

function handleUnexpectedError(
	error: unknown,
	reporter: Reporter,
	defaultExitCode: WPKExitCode,
	includeContext: boolean
): WPKExitCode {
	const payload = { error: serialiseError(error) };
	emitFatalError('Unexpected error while running generate command.', {
		context: includeContext ? payload : undefined,
		reporter,
	});
	if (!includeContext) {
		reporter.debug('Error context', payload);
	}

	return defaultExitCode;
}
