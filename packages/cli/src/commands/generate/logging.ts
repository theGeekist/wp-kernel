import type { GenerateDiagnostics, GenerateReporter } from './types';

function assertUnreachable(value: never): never {
	throw new Error(`Unhandled pipeline diagnostic: ${String(value)}`);
}

function buildDiagnosticContext(
	diagnostic: GenerateDiagnostics[number]
): Record<string, unknown> {
	switch (diagnostic.type) {
		case 'conflict':
			return {
				type: diagnostic.type,
				key: diagnostic.key,
				mode: diagnostic.mode,
				helpers: diagnostic.helpers,
				message: diagnostic.message,
				kind: diagnostic.kind,
			};
		case 'missing-dependency':
			return {
				type: diagnostic.type,
				key: diagnostic.key,
				dependency: diagnostic.dependency,
				helper: diagnostic.helper,
				message: diagnostic.message,
				kind: diagnostic.kind,
			};
		case 'unused-helper':
			return {
				type: diagnostic.type,
				key: diagnostic.key,
				helper: diagnostic.helper,
				dependsOn: diagnostic.dependsOn,
				message: diagnostic.message,
				kind: diagnostic.kind,
			};
		default:
			return assertUnreachable(diagnostic);
	}
}

/**
 * Logs pipeline diagnostics to the provided reporter.
 *
 * @param    reporter
 * @param    diagnostics
 * @category Commands
 * @example
 * ```ts
 * logDiagnostics(reporter, result.diagnostics);
 * ```
 */
export function logDiagnostics(
	reporter: GenerateReporter,
	diagnostics: GenerateDiagnostics
): void {
	diagnostics.forEach((diagnostic) => {
		reporter.warn('Pipeline diagnostic reported.', {
			...buildDiagnosticContext(diagnostic),
		});
	});
}
