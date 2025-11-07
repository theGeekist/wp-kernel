/**
 * Pipeline reporting adapters.
 *
 * These helpers convert strongly typed pipeline diagnostics into the structured
 * context expected by the WPKernel reporter so warnings remain consistent
 * across CLI and runtime surfaces.
 *
 * @module @wpkernel/core/pipeline/reporting
 */

import type { Reporter } from '../reporter/types';
import type { PipelineDiagnostic } from '@wpkernel/pipeline';

interface BaseReporterOptions {
	readonly reporter: Reporter;
}

export interface ReportPipelineDiagnosticOptions extends BaseReporterOptions {
	readonly diagnostic: PipelineDiagnostic;
}

export interface ReportPipelineDiagnosticsOptions extends BaseReporterOptions {
	readonly diagnostics: readonly PipelineDiagnostic[];
}

function buildDiagnosticContext(
	diagnostic: PipelineDiagnostic
): Record<string, unknown> {
	switch (diagnostic.type) {
		case 'conflict': {
			return {
				type: diagnostic.type,
				key: diagnostic.key,
				mode: diagnostic.mode,
				helpers: diagnostic.helpers,
				kind: diagnostic.kind,
				message: diagnostic.message,
			};
		}
		case 'missing-dependency': {
			return {
				type: diagnostic.type,
				key: diagnostic.key,
				dependency: diagnostic.dependency,
				helper: diagnostic.helper,
				kind: diagnostic.kind,
				message: diagnostic.message,
			};
		}
		case 'unused-helper': {
			return {
				type: diagnostic.type,
				key: diagnostic.key,
				helper: diagnostic.helper,
				dependsOn: diagnostic.dependsOn,
				kind: diagnostic.kind,
				message: diagnostic.message,
			};
		}
	}
}

/**
 * Emit a single pipeline diagnostic as a reporter warning.
 * @param root0
 * @param root0.reporter
 * @param root0.diagnostic
 */
export function reportPipelineDiagnostic({
	reporter,
	diagnostic,
}: ReportPipelineDiagnosticOptions): void {
	reporter.warn('Pipeline diagnostic reported.', {
		...buildDiagnosticContext(diagnostic),
	});
}

/**
 * Emit each pipeline diagnostic in sequence as reporter warnings.
 * @param root0
 * @param root0.reporter
 * @param root0.diagnostics
 */
export function reportPipelineDiagnostics({
	reporter,
	diagnostics,
}: ReportPipelineDiagnosticsOptions): void {
	for (const diagnostic of diagnostics) {
		reportPipelineDiagnostic({ reporter, diagnostic });
	}
}
