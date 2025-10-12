import { Command, Option } from 'clipanion';
import { createReporter } from '@geekist/wp-kernel';
import { WPK_NAMESPACE } from '@geekist/wp-kernel/namespace/constants';
import { resolveFromWorkspace, toWorkspaceRelative } from '../../utils';
import type { ApplySummary, ApplyFlags } from './types';
import { appendApplyLog } from './apply-log';
import { applyGeneratedPhpArtifacts } from './apply-generated-php-artifacts';
import { ensureGeneratedPhpClean } from './ensure-generated-php-clean';
import { determineExitCode, reportFailure, serialiseError } from './errors';

export class ApplyCommand extends Command {
	static override paths = [['apply']];

	static override usage = Command.Usage({
		description:
			'Apply generated PHP artifacts into the working inc/ directory.',
		examples: [['Apply generated controllers into inc/', 'wpk apply']],
	});

	yes = Option.Boolean('--yes', false);
	backup = Option.Boolean('--backup', false);
	force = Option.Boolean('--force', false);

	public summary: ApplySummary | null = null;

	override async execute(): Promise<number> {
		const reporter = createReporter({
			namespace: `${WPK_NAMESPACE}.cli.apply`,
			level: 'info',
			enabled: process.env.NODE_ENV !== 'test',
		});

		const sourceDir = resolveFromWorkspace('.generated/php');
		const targetDir = resolveFromWorkspace('inc');
		const logPath = resolveFromWorkspace('.wpk-apply.log');
		const flags: ApplyFlags = {
			yes: this.yes === true,
			backup: this.backup === true,
			force: this.force === true,
		};
		const timestamp = new Date().toISOString();

		reporter.info('Applying generated PHP artifacts.', {
			sourceDir: toWorkspaceRelative(sourceDir),
			targetDir: toWorkspaceRelative(targetDir),
			flags,
		});

		try {
			await ensureGeneratedPhpClean({
				reporter,
				sourceDir,
				yes: flags.yes,
			});

			const result = await applyGeneratedPhpArtifacts({
				reporter,
				sourceDir,
				targetDir,
				backup: flags.backup,
				force: flags.force,
			});
			this.summary = result.summary;
			reporter.info('Apply completed.', {
				summary: result.summary,
				flags,
			});
			await appendApplyLog(
				logPath,
				{
					timestamp,
					flags,
					result: 'success',
					summary: result.summary,
					files: result.records,
				},
				reporter
			);
		} catch (error) {
			const exitCode = determineExitCode(error);
			reportFailure(
				reporter,
				'Failed to apply generated PHP artifacts.',
				error
			);
			await appendApplyLog(
				logPath,
				{
					timestamp,
					flags,
					result: 'failure',
					error: serialiseError(error),
				},
				reporter
			);
			return exitCode;
		}

		const summary = this.summary!;
		const { created, updated, skipped } = summary;

		this.context.stdout.write(
			`PHP apply summary: created ${created}, updated ${updated}, skipped ${skipped}\n`
		);

		return 0;
	}
}
