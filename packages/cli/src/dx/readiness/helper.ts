import type { ReadinessHelper } from './types';

/**
 * Creates an immutable readiness helper definition.
 * @param helper
 */
export function createReadinessHelper<State>(
	helper: ReadinessHelper<State>
): ReadinessHelper<State> {
	return Object.freeze({ ...helper });
}
