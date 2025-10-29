import type { Reporter } from '../reporter/types';
import type { PipelineDiagnostic } from './types';

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

export function reportPipelineDiagnostic({
	reporter,
	diagnostic,
}: ReportPipelineDiagnosticOptions): void {
	reporter.warn('Pipeline diagnostic reported.', {
		...buildDiagnosticContext(diagnostic),
	});
}

export function reportPipelineDiagnostics({
	reporter,
	diagnostics,
}: ReportPipelineDiagnosticsOptions): void {
	for (const diagnostic of diagnostics) {
		reportPipelineDiagnostic({ reporter, diagnostic });
	}
}
