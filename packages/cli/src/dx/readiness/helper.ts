import { WPKernelError } from '@wpkernel/core/error';
import type { ReadinessHelper } from './types';

function normaliseTags(
	tags: ReadonlyArray<string> | undefined
): readonly string[] | undefined {
	if (!tags) {
		return undefined;
	}

	const trimmed = tags
		.map((tag) => tag.trim())
		.filter((tag) => tag.length > 0);

	return trimmed.length > 0
		? Object.freeze([...new Set(trimmed)])
		: undefined;
}

function normaliseScopes(
	scopes: ReadonlyArray<string> | undefined
): readonly string[] | undefined {
	if (!scopes) {
		return undefined;
	}

	const trimmed = scopes
		.map((scope) => scope.trim())
		.filter((scope) => scope.length > 0);

	return trimmed.length > 0
		? Object.freeze([...new Set(trimmed)])
		: undefined;
}

/**
 * Creates an immutable readiness helper definition.
 * @param helper
 */
export function createReadinessHelper<State>(
	helper: ReadinessHelper<State>
): ReadinessHelper<State> {
	if (!helper.metadata || typeof helper.metadata.label !== 'string') {
		throw new WPKernelError('DeveloperError', {
			message: `Readiness helper "${helper.key}" must specify metadata.label.`,
		});
	}

	const label = helper.metadata.label.trim();
	if (label.length === 0) {
		throw new WPKernelError('DeveloperError', {
			message: `Readiness helper "${helper.key}" provided an empty metadata.label.`,
		});
	}

	const metadata = Object.freeze({
		...helper.metadata,
		label,
		tags: normaliseTags(helper.metadata.tags),
		scopes: normaliseScopes(helper.metadata.scopes),
	});

	return Object.freeze({ ...helper, metadata });
}
