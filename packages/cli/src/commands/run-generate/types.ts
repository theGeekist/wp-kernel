import type { FileWriterSummary } from '../../utils';

export interface GenerationSummary extends FileWriterSummary {
	dryRun: boolean;
}
