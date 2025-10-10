import { Command, Option } from 'clipanion';
import { createReporter } from '@geekist/wp-kernel';
import { WPK_NAMESPACE } from '@geekist/wp-kernel/namespace/constants';
import {
	runGenerate,
	type ExitCode,
	type GenerationSummary,
} from './run-generate';

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
