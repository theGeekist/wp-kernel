import type { PhpProgram } from '../nodes';

export interface PhpProgramCodemodVisitorSummary {
	readonly key: string;
	readonly stackKey: string;
	readonly stackIndex: number;
	readonly visitorIndex: number;
	readonly class: string;
}

export interface PhpProgramCodemodDiagnosticsDumps {
	readonly before: string;
	readonly after: string;
}

export interface PhpProgramCodemodDiagnostics {
	readonly dumps?: PhpProgramCodemodDiagnosticsDumps;
}

export interface PhpProgramCodemodResult {
	readonly before: PhpProgram;
	readonly after: PhpProgram;
	readonly visitors: readonly PhpProgramCodemodVisitorSummary[];
	readonly diagnostics?: PhpProgramCodemodDiagnostics;
}
