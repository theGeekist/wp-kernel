export interface FlushAsyncOptions {
	iterations?: number;
	runAllTimers?: boolean;
}

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
