import type { Reporter } from './types';
import { createNoopReporter } from './index';

type ResolveReporterOptions = {
	override?: Reporter;
	runtime?: Reporter;
	fallback: () => Reporter;
	cache?: boolean;
	cacheKey?: string;
};

const fallbackReporters = new Map<string, Reporter>();
let silentReporter: Reporter | undefined;

function resolveCacheKey(cacheKey?: string): string {
	return cacheKey ?? '__default__';
}

export function isSilentReporterEnabled(): boolean {
	return process.env.WPK_SILENT_REPORTERS === '1';
}

export function getSilentReporter(): Reporter {
	if (!silentReporter) {
		silentReporter = createNoopReporter();
	}

	return silentReporter;
}

export function resolveReporter({
	override,
	runtime,
	fallback,
	cache = false,
	cacheKey,
}: ResolveReporterOptions): Reporter {
	if (override) {
		return override;
	}

	if (runtime) {
		return runtime;
	}

	if (isSilentReporterEnabled()) {
		return getSilentReporter();
	}

	if (!cache) {
		return fallback();
	}

	const key = resolveCacheKey(cacheKey);
	let reporter = fallbackReporters.get(key);

	if (!reporter) {
		reporter = fallback();
		fallbackReporters.set(key, reporter);
	}

	return reporter;
}

export function clearResolvedReporterCache(
	predicate?: (key: string) => boolean
): void {
	if (!predicate) {
		fallbackReporters.clear();
		return;
	}

	for (const key of [...fallbackReporters.keys()]) {
		if (predicate(key)) {
			fallbackReporters.delete(key);
		}
	}
}

export function resetSilentReporter(): void {
	silentReporter = undefined;
}

export function resetReporterResolution(
	predicate?: (key: string) => boolean
): void {
	clearResolvedReporterCache(predicate);
	resetSilentReporter();
}
