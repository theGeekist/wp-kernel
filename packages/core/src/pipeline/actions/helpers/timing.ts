/**
 * @internal
 * @module @wpkernel/core/pipeline/actions/helpers/timing
 */

/**
 * Read a high resolution timestamp for measuring action execution.
 *
 * The pipeline prefers `performance.now()` for monotonic timing but gracefully
 * falls back to `Date.now()` in non-browser environments (Jest, SSR). The
 * helper is centralised so future helpers can share consistent timing
 * semantics.
 */
export function readMonotonicTime(): number {
	const perf = globalThis.performance;

	if (perf && typeof perf.now === 'function') {
		return perf.now();
	}

	return Date.now();
}

/**
 * Derive a duration in milliseconds from a previously captured start time.
 *
 * This helper intentionally clamps negative values that could appear if a
 * caller provides a future start timestamp (for example when reusing cached
 * drafts) so lifecycle events never emit negative durations.
 *
 * @param startTime - Timestamp captured before the invocation began.
 */
export function measureDurationMs(startTime: number): number {
	const duration = readMonotonicTime() - startTime;

	return duration >= 0 ? duration : 0;
}
