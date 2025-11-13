import { performance } from 'node:perf_hooks';
import type { Reporter } from '@wpkernel/core/reporter';
import type { StageMeasurement } from '../commands/init/types';
import { measureStage } from '../commands/init/timing';
import type { MaybePromise } from '@wpkernel/pipeline';

const SPINNER_FRAMES = ['⠋', '⠙', '⠸', '⠴', '⠦', '⠇'];

export interface ProgressOptions<T> {
	readonly reporter: Reporter;
	readonly label: string;
	readonly detail?: string;
	readonly run: () => MaybePromise<T>;
	readonly intervalMs?: number;
	readonly successMessage?: (durationMs: number, result: T) => string;
	readonly failureMessage?: (durationMs: number, error: unknown) => string;
}

export async function runWithProgress<T>({
	reporter,
	label,
	detail,
	run,
	intervalMs = 4000,
	successMessage,
	failureMessage,
}: ProgressOptions<T>): Promise<{ result: T; durationMs: number }> {
	const start = performance.now();
	let frameIndex = 0;

	reporter.info(formatStartMessage(label, detail));
	const interval = setInterval(() => {
		const elapsed = Math.round((performance.now() - start) / 1000);
		const frame = SPINNER_FRAMES[frameIndex];
		frameIndex = (frameIndex + 1) % SPINNER_FRAMES.length;
		reporter.info(`${frame} ${label} (${elapsed}s elapsed)`);
	}, intervalMs);

	try {
		const result = await run();
		const durationMs = performance.now() - start;
		const message =
			successMessage?.(durationMs, result) ??
			`✓ ${label} completed in ${formatDuration(durationMs)}.`;
		reporter.info(message);
		return { result, durationMs };
	} catch (error) {
		const durationMs = performance.now() - start;
		const message =
			failureMessage?.(durationMs, error) ??
			`✖ ${label} failed after ${formatDuration(durationMs)}.`;
		reporter.error(message, { error });
		throw error;
	} finally {
		clearInterval(interval);
	}
}

export async function measureStageWithProgress({
	reporter,
	label,
	stage,
	budgetMs,
	run,
}: {
	reporter: Reporter;
	label: string;
	stage: string;
	budgetMs: number;
	run: () => MaybePromise<void>;
}): Promise<StageMeasurement> {
	const { result: measurement } = await runWithProgress({
		reporter,
		label,
		run: () =>
			measureStage({
				stage,
				label,
				budgetMs,
				run: async () => {
					await run();
				},
				logCompletion: false,
			}),
		successMessage: (duration, value) =>
			`✓ ${label} completed in ${formatDuration(duration)} (budget ${formatDuration(value.budgetMs)}).`,
	});

	return measurement;
}

export function formatDuration(durationMs: number): string {
	if (!Number.isFinite(durationMs) || durationMs < 0) {
		return 'unknown time';
	}

	if (durationMs < 1000) {
		return `${Math.round(durationMs)}ms`;
	}

	const seconds = durationMs / 1000;
	if (seconds < 60) {
		return `${seconds.toFixed(1)}s`;
	}

	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = Math.round(seconds % 60);
	return `${minutes}m ${remainingSeconds}s`;
}

function formatStartMessage(label: string, detail?: string): string {
	if (!detail) {
		return `${label}...`;
	}

	return `${label} (${detail})...`;
}
