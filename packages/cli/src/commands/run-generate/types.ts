import { WPK_EXIT_CODES, type WPKExitCode } from '@wpkernel/core/contracts';
import type { Reporter } from '@wpkernel/core/reporter';
import type { FileWriterSummary } from '../../utils';

export type ExitCode = WPKExitCode;
export const EXIT_CODES = WPK_EXIT_CODES;

export interface GenerationSummary extends FileWriterSummary {
	dryRun: boolean;
}

export interface RunGenerateOptions {
	dryRun?: boolean;
	verbose?: boolean;
	reporter?: Reporter;
}

export interface RunGenerateResult {
	exitCode: ExitCode;
	summary?: GenerationSummary;
	output?: string;
	error?: unknown;
}
