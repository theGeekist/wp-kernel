import { Command, Option } from 'clipanion';
import { createReporter } from '@geekist/wp-kernel';
import { WPK_NAMESPACE } from '@geekist/wp-kernel/namespace/constants';
import { resolveFromWorkspace, toWorkspaceRelative } from '../../utils';
import type { ApplySummary, ApplyFlags } from './types';
import { appendApplyLog } from './apply-log';
import { applyGeneratedPhpArtifacts } from './apply-generated-php-artifacts';
import { applyGeneratedBlockArtifacts } from './apply-block-artifacts';
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
	public phpSummary: ApplySummary | null = null;
	public blockSummary: ApplySummary | null = null;

	override async execute(): Promise<number> {
		const reporter = createReporter({
			namespace: `${WPK_NAMESPACE}.cli.apply`,
			level: 'info',
			enabled: process.env.NODE_ENV !== 'test',
		});

		const sourcePhpDir = resolveFromWorkspace('.generated/php');
		const targetPhpDir = resolveFromWorkspace('inc');
		const sourceBuildDir = resolveFromWorkspace('.generated/build');
		const targetBuildDir = resolveFromWorkspace('build');
		const logPath = resolveFromWorkspace('.wpk-apply.log');
		const flags: ApplyFlags = {
			yes: this.yes === true,
			backup: this.backup === true,
			force: this.force === true,
		};
		const timestamp = new Date().toISOString();

		reporter.info('Applying generated PHP artifacts.', {
			sourceDir: toWorkspaceRelative(sourcePhpDir),
			targetDir: toWorkspaceRelative(targetPhpDir),
			flags,
		});

		try {
			await ensureGeneratedPhpClean({
				reporter,
				sourceDir: sourcePhpDir,
				yes: flags.yes,
			});

			const phpResult = await applyGeneratedPhpArtifacts({
				reporter,
				sourceDir: sourcePhpDir,
				targetDir: targetPhpDir,
				backup: flags.backup,
				force: flags.force,
			});
			const blockResult = await applyGeneratedBlockArtifacts({
				reporter,
				sourceDir: sourceBuildDir,
				targetDir: targetBuildDir,
				backup: flags.backup,
				force: flags.force,
			});

			const phpSummary = phpResult.summary;
			const blockSummary = blockResult.summary;
			const summary = combineSummaries(phpSummary, blockSummary);
			const records = [...phpResult.records, ...blockResult.records];

			this.summary = summary;
			this.phpSummary = phpSummary;
			this.blockSummary = blockSummary;
			reporter.info('Apply completed.', {
				summary,
				breakdown: {
					php: phpSummary,
					blocks: blockSummary,
				},
				flags,
			});
			await appendApplyLog(
				logPath,
				{
					timestamp,
					flags,
					result: 'success',
					summary,
					files: records,
					php: {
						summary: phpSummary,
						files: phpResult.records,
					},
					blocks: {
						summary: blockSummary,
						files: blockResult.records,
					},
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
		const phpSummary = this.phpSummary!;
		const blockSummary = this.blockSummary!;

		this.context.stdout.write(
			formatSummaryOutput({
				total: summary,
				php: phpSummary,
				blocks: blockSummary,
			})
		);

		return 0;
	}
}

function combineSummaries(
	left: ApplySummary,
	right: ApplySummary
): ApplySummary {
	return {
		created: left.created + right.created,
		updated: left.updated + right.updated,
		skipped: left.skipped + right.skipped,
	};
}

function formatSummaryOutput({
	php,
	blocks,
	total,
}: {
	php: ApplySummary;
	blocks: ApplySummary;
	total: ApplySummary;
}): string {
	const lines = [
		'Apply summary:',
		`  PHP: created ${php.created}, updated ${php.updated}, skipped ${php.skipped}`,
		`  Blocks: created ${blocks.created}, updated ${blocks.updated}, skipped ${blocks.skipped}`,
		`  Total: created ${total.created}, updated ${total.updated}, skipped ${total.skipped}`,
	];

	return `${lines.join('\n')}\n`;
}
