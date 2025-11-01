import type { GenerateDiagnostics, GenerateReporter } from './types';

export function logDiagnostics(
	reporter: GenerateReporter,
	diagnostics: GenerateDiagnostics
): void {
	diagnostics.forEach((diagnostic) => {
		reporter.warn('Pipeline diagnostic reported.', {
			key: diagnostic.key,
			mode: diagnostic.mode,
			message: diagnostic.message,
			helpers: diagnostic.helpers,
		});
	});
}
