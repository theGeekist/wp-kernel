import { createReporter, createNoopReporter } from '../reporter';
import type { Reporter } from '../reporter';

export interface ResolveResourceReporterOptions {
	readonly namespace: string;
	readonly resourceName: string;
	readonly override?: Reporter;
}

export function resolveResourceReporter({
	namespace,
	resourceName,
	override,
}: ResolveResourceReporterOptions): Reporter {
	if (override) {
		return override;
	}

	if (process.env.WPK_SILENT_REPORTERS === '1') {
		return createNoopReporter();
	}

	return createReporter({
		namespace: `${namespace}.resource.${resourceName}`,
		channel: 'all',
		level: 'debug',
	});
}
