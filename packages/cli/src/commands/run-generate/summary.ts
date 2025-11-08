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

	const artifactHints = [
		{
			label: 'php',
			directory: '.generated/php',
			description: 'REST controllers',
		},
		{
			label: 'ui',
			directory: '.generated/ui',
			description: 'admin application',
		},
		{
			label: 'capabilities',
			directory: '.generated/js',
			description: 'capability runtime',
		},
	] as const;

	const touchedArtifacts = artifactHints.filter(({ directory }) =>
		summary.entries.some(
			(entry) =>
				entry.path === directory ||
				entry.path.startsWith(`${directory}/`)
		)
	);

	if (touchedArtifacts.length > 0) {
		parts.push('  artifacts:');
		for (const artifact of touchedArtifacts) {
			parts.push(
				`    - ${artifact.label}: ${artifact.directory} (${artifact.description})`
			);
		}
	}

	if (verbose && summary.entries.length > 0) {
		parts.push('  files:');
		for (const entry of summary.entries) {
			parts.push(`    - ${entry.status.padEnd(9)} ${entry.path}`);
		}
	}

	parts.push('\n');
	return parts.join('\n');
}
