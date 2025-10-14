import type { FileWriterSummary } from '../../utils';

export function renderSummary(
	summary: FileWriterSummary,
	dryRun: boolean,
	verbose: boolean
): string {
	const parts: string[] = [];
	parts.push('\n[wpk] generate summary');
	parts.push(
		`  mode: ${dryRun ? 'dry-run' : 'write'} | written=${summary.counts.written}` +
			` unchanged=${summary.counts.unchanged}` +
			` skipped=${summary.counts.skipped}`
	);

	if (verbose && summary.entries.length > 0) {
		parts.push('  files:');
		for (const entry of summary.entries) {
			parts.push(`    - ${entry.status.padEnd(9)} ${entry.path}`);
		}
	}

	parts.push('\n');
	return parts.join('\n');
}
