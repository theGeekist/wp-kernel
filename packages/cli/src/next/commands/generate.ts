import { Command, Option } from 'clipanion';
import { createReporter as defaultBuildReporter } from '@wpkernel/core/reporter';
import { WPK_NAMESPACE, type WPKExitCode } from '@wpkernel/core/contracts';
import type { GenerationSummary } from '../../commands/run-generate/types';
import {
	mergeDependencies,
	runGeneration,
	type BuildGenerateCommandOptions as SharedBuildGenerateCommandOptions,
} from './generate/runtime';

function buildReporterNamespace(): string {
	return `${WPK_NAMESPACE}.cli.next.generate`;
}

export interface BuildGenerateCommandOptions
	extends SharedBuildGenerateCommandOptions {
	readonly buildReporter?: typeof defaultBuildReporter;
}

export function buildGenerateCommand(
	options: BuildGenerateCommandOptions = {}
): new () => Command & { summary: GenerationSummary | null } {
	const dependencies = mergeDependencies(options);
	const buildReporter = options.buildReporter ?? defaultBuildReporter;

	class NextGenerateCommand extends Command {
		static override paths = [['generate']];

		static override usage = Command.Usage({
			description: 'Generate WP Kernel artifacts from kernel.config.*.',
			examples: [
				['Generate artifacts into .generated/', 'wpk generate'],
				[
					'Preview changes without writing files',
					'wpk generate --dry-run',
				],
				[
					'Verbose logging including per-file status',
					'wpk generate --verbose',
				],
			],
		});

		dryRun = Option.Boolean('--dry-run', false);
		verbose = Option.Boolean('--verbose', false);

		public summary: GenerationSummary | null = null;

		override async execute(): Promise<WPKExitCode> {
			const reporter = buildReporter({
				namespace: buildReporterNamespace(),
				level: this.verbose ? 'debug' : 'info',
				enabled: process.env.NODE_ENV !== 'test',
			});

			this.summary = null;

			const result = await runGeneration(dependencies, {
				reporter,
				verbose: this.verbose,
				dryRun: this.dryRun,
				stdout: this.context.stdout,
			});

			this.summary = result.summary;
			return result.exitCode;
		}
	}

	return NextGenerateCommand;
}
