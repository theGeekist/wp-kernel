/**
 * Options for the `flushAsync` function.
 *
 * @category CLI Helpers
 */
export interface FlushAsyncOptions {
	/** The number of microtask queue flushes to perform. Defaults to 2. */
	iterations?: number;
	/** Whether to run all pending timers after flushing microtasks. */
	runAllTimers?: boolean;
}

/**
 * Flushes the microtask queue and optionally advances Jest timers.
 *
 * This is useful in tests to ensure all pending promises and microtasks are resolved.
 *
 * @category CLI Helpers
 * @param    options - Options for flushing, either a number of iterations or an object.
 * @returns A Promise that resolves after the microtask queue is flushed.
 */
export async function flushAsync(
	options: number | FlushAsyncOptions = {}
): Promise<void> {
	const { iterations, runAllTimers } =
		typeof options === 'number'
			? { iterations: options, runAllTimers: false }
			: {
					iterations: options.iterations ?? 2,
					runAllTimers: options.runAllTimers ?? false,
				};

	for (let index = 0; index < iterations; index += 1) {
		await Promise.resolve();
	}

	if (runAllTimers && typeof jest?.advanceTimersByTimeAsync === 'function') {
		try {
			await jest.advanceTimersByTimeAsync(0);
		} catch {
			// noop when timers are not mocked
		}
	}
}
