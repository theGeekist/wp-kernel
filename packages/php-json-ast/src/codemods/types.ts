import type { PhpProgram } from '../nodes';

export interface PhpProgramCodemodVisitorSummary {
	readonly key: string;
	readonly stackKey: string;
	readonly stackIndex: number;
	readonly visitorIndex: number;
	readonly class: string;
}

export interface PhpProgramCodemodResult {
	readonly before: PhpProgram;
	readonly after: PhpProgram;
	readonly visitors: readonly PhpProgramCodemodVisitorSummary[];
}
