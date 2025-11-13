declare module '@wpkernel/cli/utils/reporter.js' {
	import type { Reporter, ReporterOptions } from '@wpkernel/core/reporter';

	export function createReporterCLI(options?: ReporterOptions): Reporter;
}
