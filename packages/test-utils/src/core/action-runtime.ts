import type { ActionRuntime } from '@wpkernel/core/dist/actions/types.js';

declare global {
	var __WP_KERNEL_ACTION_RUNTIME__: ActionRuntime | undefined;
}

/**
 * Overrides for the action runtime.
 *
 * @category Action Runtime
 */
export interface ActionRuntimeOverrides {
	/** Partial overrides for the entire runtime object. */
	runtime?: Partial<ActionRuntime>;
	/** Override for the capability object within the runtime. */
	capability?: ActionRuntime['capability'];
}

/**
 * A function to clean up action runtime overrides.
 *
 * @category Action Runtime
 */
export type RuntimeCleanup = () => void;

function assignRuntime(
	original: ActionRuntime | undefined,
	overrides: ActionRuntimeOverrides
): ActionRuntime {
	const merged: ActionRuntime = {
		...(original ?? {}),
		...(overrides.runtime ?? {}),
	} as ActionRuntime;

	if ('capability' in overrides) {
		merged.capability = overrides.capability;
	}

	if (!merged.capability) {
		merged.capability = {
			can: jest.fn().mockResolvedValue(true),
		} as ActionRuntime['capability'];
	}

	return merged;
}

/**
 * Applies overrides to the global action runtime and returns a cleanup function.
 *
 * @category Action Runtime
 * @param    overrides - The overrides to apply to the action runtime.
 * @returns A function that, when called, restores the original action runtime.
 */
export function applyActionRuntimeOverrides(
	overrides: ActionRuntimeOverrides
): RuntimeCleanup {
	const original = globalThis.__WP_KERNEL_ACTION_RUNTIME__ as
		| ActionRuntime
		| undefined;
	const merged = assignRuntime(original, overrides);

	(
		globalThis as {
			__WP_KERNEL_ACTION_RUNTIME__?: ActionRuntime;
		}
	).__WP_KERNEL_ACTION_RUNTIME__ = merged;

	return () => {
		if (original === undefined) {
			delete (globalThis as { __WP_KERNEL_ACTION_RUNTIME__?: unknown })
				.__WP_KERNEL_ACTION_RUNTIME__;
		} else {
			globalThis.__WP_KERNEL_ACTION_RUNTIME__ = original;
		}
	};
}

/**
 * Executes a callback with temporary action runtime overrides, ensuring cleanup afterwards.
 *
 * @category Action Runtime
 * @param    overrides - The overrides to apply to the action runtime.
 * @param    callback  - The function to execute with the modified runtime.
 * @returns The return value of the callback.
 */
export async function withActionRuntimeOverrides<T>(
	overrides: ActionRuntimeOverrides,
	callback: () => Promise<T> | T
): Promise<T> {
	const cleanup = applyActionRuntimeOverrides(overrides);

	try {
		return await callback();
	} finally {
		cleanup();
	}
}
