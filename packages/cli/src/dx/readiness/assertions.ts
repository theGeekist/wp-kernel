import { WPKernelError } from '@wpkernel/core/error';
import type { ReadinessOutcome, ReadinessRunResult } from './types';

function throwReadinessError(error: unknown, helper: string): never {
	if (WPKernelError.isWPKernelError(error)) {
		throw error;
	}

	if (error instanceof Error) {
		throw WPKernelError.wrap(error, 'DeveloperError', { helper });
	}

	throw new WPKernelError('UnknownError', {
		message: `Readiness helper ${helper} failed with unknown error.`,
		data: { helper, error },
	});
}

function selectFailingOutcome(
	outcomes: readonly ReadinessOutcome[]
): ReadinessOutcome | undefined {
	return outcomes.find(
		(outcome) =>
			outcome.status === 'failed' ||
			outcome.status === 'blocked' ||
			outcome.status === 'pending'
	);
}

function throwValidationFailure(
	outcome: ReadinessOutcome,
	outcomes: readonly ReadinessOutcome[]
): never {
	const message =
		outcome.confirmation?.message ??
		outcome.detection?.message ??
		`Readiness helper ${outcome.key} did not complete.`;

	throw new WPKernelError('ValidationError', {
		message,
		data: {
			helper: outcome.key,
			readiness: outcomes,
		},
	});
}

export function assertReadinessRun(result: ReadinessRunResult): void {
	if (result.error) {
		throwReadinessError(result.error, 'readiness-registry');
	}

	const failingOutcome = selectFailingOutcome(result.outcomes);
	if (!failingOutcome) {
		return;
	}

	if (failingOutcome.status === 'failed' && failingOutcome.error) {
		throwReadinessError(failingOutcome.error, failingOutcome.key);
	}

	throwValidationFailure(failingOutcome, result.outcomes);
}
