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
	const { summary, detailLines, serialized } = describeReadableError(error);
	const phaseLog = phaseReporter(reporter, phase);
	const base = formatPhaseMessage(phase, 'failed');
	const headline = summary ? appendSummary(base, summary) : base;

	phaseLog.error(headline);

	for (const detail of detailLines) {
		phaseLog.error(`  • ${detail}`);
	}

	phaseLog.debug('Failure details.', { error: serialized });
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

type SerializedKernelError = ReturnType<typeof serializeWPKernelError>;

function describeReadableError(error: unknown): {
	summary: string;
	detailLines: string[];
	serialized: SerializedKernelError;
} {
	const serialized = serialiseUnknown(error);
	return {
		summary: buildErrorSummary(serialized),
		detailLines: buildErrorDetailLines(serialized),
		serialized,
	};
}

function buildErrorSummary(error: SerializedKernelError): string {
	const reason = extractReason(error);
	const headline = reason ?? error.code ?? error.name;
	const fallback = extractString(error.data, 'message');
	const message = error.message ?? fallback ?? '';

	if (headline && message) {
		return `${headline}: ${message}`;
	}

	return headline ?? message ?? 'Unexpected readiness failure';
}

function buildErrorDetailLines(error: SerializedKernelError): string[] {
	const lines: string[] = [];
	const stderrSummary = extractStringArray(error.data, 'stderrSummary');

	if (stderrSummary.length > 0) {
		lines.push(...stderrSummary);
	} else {
		const stderr = extractString(error.data, 'stderr');
		if (stderr) {
			lines.push(...stderr.split(/\r?\n/u).filter(Boolean).slice(0, 3));
		}
	}

	const filePath = extractString(error.data, 'filePath');
	if (filePath) {
		lines.push(`file: ${filePath}`);
	}

	const manifestPath = extractString(error.data, 'manifestPath');
	if (manifestPath) {
		lines.push(`manifest: ${manifestPath}`);
	}

	const exitCode = extractNumber(error.data, 'exitCode');
	if (typeof exitCode === 'number') {
		lines.push(`exit code: ${exitCode}`);
	}

	return lines;
}

function extractString(
	data: SerializedKernelError['data'],
	key: string
): string | undefined {
	if (!data || typeof data !== 'object') {
		return undefined;
	}

	const value = (data as Record<string, unknown>)[key];
	return typeof value === 'string' ? value : undefined;
}

function extractNumber(
	data: SerializedKernelError['data'],
	key: string
): number | undefined {
	if (!data || typeof data !== 'object') {
		return undefined;
	}

	const value = (data as Record<string, unknown>)[key];
	return typeof value === 'number' ? value : undefined;
}

function extractStringArray(
	data: SerializedKernelError['data'],
	key: string
): string[] {
	if (!data || typeof data !== 'object') {
		return [];
	}

	const value = (data as Record<string, unknown>)[key];
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.filter((entry) => typeof entry === 'string')
		.map((entry) => (entry as string).trim())
		.filter((entry) => entry.length > 0);
}

function extractReason(error: SerializedKernelError): string | undefined {
	const candidate = (error as { reason?: unknown }).reason;
	return typeof candidate === 'string' ? candidate : undefined;
}

function appendSummary(base: string, summary: string): string {
	const trimmed = base.endsWith('.') ? base.slice(0, -1) : base;
	return `${trimmed}: ${summary}`;
}
