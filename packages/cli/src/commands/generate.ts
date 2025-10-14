import { Command, Option } from 'clipanion';
import { createReporter } from '@wpkernel/core/reporter';
import { WPK_NAMESPACE } from '@wpkernel/core/contracts';
import {
	runGenerate,
	type ExitCode,
	type GenerationSummary,
} from './run-generate';

/**
 * Clipanion command for generating kernel artifacts.
 *
 * The command powers `wpk generate`, running printers and emitting summary
 * metadata back to the invoking context for inspection in tests or higher level
 * tooling.
 */
export class GenerateCommand extends Command {
	static override paths = [['generate']];

	static override usage = Command.Usage({
		description: 'Generate WP Kernel artifacts from kernel.config.*.',
		examples: [
			['Generate artifacts into .generated/', 'wpk generate'],
			['Preview changes without writing files', 'wpk generate --dry-run'],
			[
				'Verbose logging including per-file status',
				'wpk generate --verbose',
			],
		],
	});

	dryRun = Option.Boolean('--dry-run', false);
	verbose = Option.Boolean('--verbose', false);

	/**
	 * Summary of the last generation run, populated after `execute` completes.
	 */
	public summary?: GenerationSummary;

	override async execute(): Promise<ExitCode> {
		const reporter = createReporter({
			namespace: `${WPK_NAMESPACE}.cli.generate`,
			level: this.verbose ? 'debug' : 'info',
			enabled: process.env.NODE_ENV !== 'test',
		});

		const result = await runGenerate({
			dryRun: this.dryRun,
			verbose: this.verbose,
			reporter,
		});

		this.summary = result.summary;

		if (result.output) {
			this.context.stdout.write(result.output);
		}

		return result.exitCode;
	}
}
