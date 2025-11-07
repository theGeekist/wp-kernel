import { createReporter as createWPKernelReporter } from '../reporter';
import {
	resolveReporter as resolveKernelReporter,
	resetReporterResolution,
} from '../reporter/resolve';
import type { Reporter } from '../reporter/types';
import type { ActionRuntime } from './types';

type ResolveActionReporterOptions = {
	namespace: string;
	runtime?: ActionRuntime;
};

const ACTION_CACHE_PREFIX = 'action:';

export function resolveActionReporter({
	namespace,
	runtime,
}: ResolveActionReporterOptions): Reporter {
	const resolvedRuntime =
		runtime ??
		(globalThis.__WP_KERNEL_ACTION_RUNTIME__ as ActionRuntime | undefined);

	return resolveKernelReporter({
		runtime: resolvedRuntime?.reporter,
		fallback: () =>
			createWPKernelReporter({
				namespace,
				channel: 'all',
				level: 'debug',
			}),
		cache: true,
		cacheKey: `${ACTION_CACHE_PREFIX}${namespace}`,
	});
}

export function resetResolvedActionReporters(): void {
	resetReporterResolution((key) => key.startsWith(ACTION_CACHE_PREFIX));
}
