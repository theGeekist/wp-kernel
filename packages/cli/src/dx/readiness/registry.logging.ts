import { WPKernelError } from '@wpkernel/core/error';
import { serializeWPKernelError } from '@wpkernel/core/contracts';
import type { Reporter } from '@wpkernel/core/reporter';
import type {
	ReadinessConfirmation,
	ReadinessDetection,
	ReadinessOutcomeStatus,
} from './types';

export const PHASE_LABELS = {
	detect: 'Detect',
	prepare: 'Prepare',
	execute: 'Execute',
	confirm: 'Confirm',
} as const;

export type ReadinessPhase = keyof typeof PHASE_LABELS;

export function formatPhaseMessage(
	phase: ReadinessPhase,
	suffix: string
): string {
	return `${PHASE_LABELS[phase]} phase ${suffix}.`;
}

function buildPhaseContext(
	status: string | undefined,
	message: string | undefined
): Record<string, unknown> | undefined {
	const context: Record<string, unknown> = {};

	if (status) {
		context.status = status;
	}

	if (message) {
		context.message = message;
	}

	return Object.keys(context).length > 0 ? context : undefined;
}

export function phaseReporter(
	reporter: Reporter,
	phase: ReadinessPhase
): Reporter {
	return reporter.child(phase);
}

export function logPhaseStart(reporter: Reporter, phase: ReadinessPhase): void {
	phaseReporter(reporter, phase).info(formatPhaseMessage(phase, 'started'));
}

export function logPhaseSuccess(
	reporter: Reporter,
	phase: ReadinessPhase
): void {
	phaseReporter(reporter, phase).info(formatPhaseMessage(phase, 'completed'));
}

export function logPhaseFailure(
	reporter: Reporter,
	phase: ReadinessPhase,
	error: unknown
): void {
	phaseReporter(reporter, phase).error(formatPhaseMessage(phase, 'failed'), {
		error: serialiseUnknown(error),
	});
}

export function logDetectionResult(
	reporter: Reporter,
	detection: ReadinessDetection<unknown>
): void {
	const context = buildPhaseContext(detection.status, detection.message);
	const target = phaseReporter(reporter, 'detect');

	switch (detection.status) {
		case 'ready':
			target.info('Detect phase reported ready.', context);
			break;
		case 'pending':
			target.warn('Detect phase reported pending readiness.', context);
			break;
		case 'blocked':
			target.error('Detect phase blocked readiness.', context);
			break;
	}
}

export function logConfirmationResult(
	reporter: Reporter,
	confirmation: ReadinessConfirmation<unknown>
): void {
	const context = buildPhaseContext(
		confirmation.status,
		confirmation.message
	);
	const target = phaseReporter(reporter, 'confirm');

	if (confirmation.status === 'ready') {
		target.info('Confirm phase reported ready.', context);
		return;
	}

	target.warn('Confirm phase reported pending readiness.', context);
}

export function logOutcome(
	reporter: Reporter,
	status: ReadinessOutcomeStatus,
	detection: ReadinessDetection<unknown> | undefined,
	confirmation: ReadinessConfirmation<unknown> | undefined
): void {
	const message = confirmation?.message ?? detection?.message;
	const context = buildPhaseContext(status, message);

	switch (status) {
		case 'ready':
		case 'updated':
			reporter.info('Readiness helper completed.', context);
			break;
		case 'pending':
			reporter.warn('Readiness helper pending follow-up.', context);
			break;
		case 'blocked':
			reporter.error('Readiness helper blocked.', context);
			break;
		case 'failed':
			reporter.error('Readiness helper failed.', context);
			break;
	}
}

export function serialiseUnknown(error: unknown) {
	if (WPKernelError.isWPKernelError(error)) {
		return serializeWPKernelError(error);
	}

	if (error instanceof Error) {
		return serializeWPKernelError(WPKernelError.wrap(error));
	}

	return serializeWPKernelError(
		new WPKernelError('UnknownError', {
			message: 'Unexpected error during readiness orchestration.',
			data: { value: error },
		})
	);
}
