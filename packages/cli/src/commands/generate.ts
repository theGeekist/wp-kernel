import { Command, Option } from 'clipanion';
import { WPK_EXIT_CODES, type WPKExitCode } from '@wpkernel/core/contracts';
import type { GenerationSummary } from './run-generate/types';
import { handleFailure } from './run-generate/errors';
import {
	buildGenerateDependencies,
	buildReporterNamespace,
	resolveWorkspaceRoot,
} from './generate/dependencies';
import { logDiagnostics } from './generate/logging';
import { createTrackedWorkspace, safeRollback } from './generate/workspace';
import type {
	BuildGenerateCommandOptions,
	GenerateDependencies,
	GenerateResult,
	GenerateExecutionOptions,
} from './generate/types';

type CommandConstructor = new () => Command & {
	summary: GenerationSummary | null;
};

const TRANSACTION_LABEL = 'generate';

function buildFailure(exitCode: WPKExitCode): GenerateResult {
	return {
		exitCode,
		summary: null,
		output: null,
	};
}

async function runGenerateWorkflow(
	options: GenerateExecutionOptions
): Promise<GenerateResult> {
	const { dependencies, reporter, dryRun, verbose } = options;

	try {
		const loaded = await dependencies.loadWPKernelConfig();
		const workspaceRoot = resolveWorkspaceRoot(loaded);
		const baseWorkspace = dependencies.buildWorkspace(workspaceRoot);
		const tracked = createTrackedWorkspace(baseWorkspace, { dryRun });
		const pipeline = dependencies.createPipeline();

		dependencies.registerFragments(pipeline);
		dependencies.registerBuilders(pipeline);
		pipeline.extensions.use(dependencies.buildAdapterExtensionsExtension());

		tracked.workspace.begin(TRANSACTION_LABEL);

		try {
			const result = await pipeline.run({
				phase: 'generate',
				config: loaded.config,
				namespace: loaded.namespace,
				origin: loaded.configOrigin,
				sourcePath: loaded.sourcePath,
				workspace: tracked.workspace,
				reporter,
			});

			logDiagnostics(reporter, result.diagnostics);

			const writerSummary = tracked.summary.buildSummary();
			const generationSummary: GenerationSummary = {
				...writerSummary,
				dryRun,
			};

			if (dryRun) {
				await tracked.workspace.rollback(TRANSACTION_LABEL);
			} else {
				await tracked.workspace.commit(TRANSACTION_LABEL);
			}

			reporter.info('Generation completed.', {
				dryRun,
				counts: writerSummary.counts,
			});
			reporter.debug('Generated files.', {
				files: writerSummary.entries,
			});

			try {
				await dependencies.validateGeneratedImports({
					projectRoot: tracked.workspace.root,
					summary: generationSummary,
					reporter,
				});
			} catch (error) {
				const exitCode = handleFailure(
					error,
					reporter,
					WPK_EXIT_CODES.UNEXPECTED_ERROR
				);
				return buildFailure(exitCode);
			}

			const output = dependencies.renderSummary(
				writerSummary,
				dryRun,
				verbose
			);

			return {
				exitCode: WPK_EXIT_CODES.SUCCESS,
				summary: generationSummary,
				output,
			} satisfies GenerateResult;
		} catch (error) {
			await safeRollback(tracked.workspace, TRANSACTION_LABEL);
			const exitCode = handleFailure(
				error,
				reporter,
				WPK_EXIT_CODES.UNEXPECTED_ERROR
			);
			return buildFailure(exitCode);
		}
	} catch (error) {
		const exitCode = handleFailure(
			error,
			reporter,
			WPK_EXIT_CODES.UNEXPECTED_ERROR
		);
		return buildFailure(exitCode);
	}
}

function buildCommandConstructor(
	dependencies: GenerateDependencies
): CommandConstructor {
	return class NextGenerateCommand extends Command {
		static override paths = [['generate']];

		static override usage = Command.Usage({
			description: 'Generate WP Kernel artifacts from wpk.config.*.',
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
			const reporter = dependencies.buildReporter({
				namespace: buildReporterNamespace(),
				level: this.verbose ? 'debug' : 'info',
				enabled: process.env.NODE_ENV !== 'test',
			});

			this.summary = null;

			const result = await runGenerateWorkflow({
				dependencies,
				reporter,
				dryRun: this.dryRun,
				verbose: this.verbose,
			});

			if (result.output) {
				this.context.stdout.write(result.output);
			}

			this.summary = result.summary;

			return result.exitCode;
		}
	};
}

export function buildGenerateCommand(
	options: BuildGenerateCommandOptions = {}
): CommandConstructor {
	const dependencies = buildGenerateDependencies(options);
	return buildCommandConstructor(dependencies);
}

export type { BuildGenerateCommandOptions };
