import type { Reporter } from '@geekist/wp-kernel/reporter';
import type { FileWriterSummary } from '../../utils';

type ExitCodeSuccess = 0;
type ExitCodeFailure = 1 | 2 | 3;

export type ExitCode = ExitCodeSuccess | ExitCodeFailure;

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
