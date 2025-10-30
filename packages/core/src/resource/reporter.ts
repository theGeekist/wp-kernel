import { createReporter } from '../reporter';
import { resolveReporter as resolveKernelReporter } from '../reporter/resolve';
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
	return resolveKernelReporter({
		override,
		fallback: () =>
			createReporter({
				namespace: `${namespace}.resource.${resourceName}`,
				channel: 'all',
				level: 'debug',
			}),
	});
}
