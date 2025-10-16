import type { ActionRuntime } from '@wpkernel/core/actions/types.js';

export interface ActionRuntimeOverrides {
	runtime?: Partial<ActionRuntime>;
	policy?: ActionRuntime['policy'];
}

export type RuntimeCleanup = () => void;

function assignRuntime(
	original: ActionRuntime | undefined,
	overrides: ActionRuntimeOverrides
): ActionRuntime {
	const merged: ActionRuntime = {
		...(original ?? {}),
		...(overrides.runtime ?? {}),
	} as ActionRuntime;

	if ('policy' in overrides) {
		merged.policy = overrides.policy;
	}

	if (!merged.policy) {
		merged.policy = {
			can: jest.fn().mockResolvedValue(true),
		} as ActionRuntime['policy'];
	}

	return merged;
}

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
