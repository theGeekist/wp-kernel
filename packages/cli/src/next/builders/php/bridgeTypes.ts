import type { PhpProgram } from './ast/nodes';

export interface PhpPrettyPrintResult {
	readonly code: string;
	readonly ast?: PhpProgram;
}

export interface PhpPrettyPrintPayload {
	readonly filePath: string;
	readonly program: PhpProgram;
}

export interface PhpPrettyPrinter {
	prettyPrint: (
		payload: PhpPrettyPrintPayload
	) => Promise<PhpPrettyPrintResult>;
}
