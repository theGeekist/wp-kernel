import { Command, Option } from 'clipanion';
import { createReporterCLI as buildReporter } from '../utils/reporter.js';
import { WPKernelError } from '@wpkernel/core/error';
import {
	WPK_NAMESPACE,
	WPK_EXIT_CODES,
	type WPKExitCode,
} from '@wpkernel/core/contracts';
import type { Reporter } from '@wpkernel/core/reporter';
import type { Workspace, FileManifest } from '../workspace';
import { buildWorkspace } from '../workspace';
import { runInitWorkflow } from './init/workflow';
import { isGitRepository } from './init/git';
import {
	createInitCommandRuntime,
	formatInitWorkflowError,
	resolveCommandCwd,
	type InitCommandRuntimeResult,
} from './init/command-runtime';

// Re-export types from sub-modules for TypeDoc
export type { InitWorkflowOptions, InitWorkflowResult } from './init/workflow';
export type { GitDependencies } from './init/git';
export type { ScaffoldStatus } from './init/utils';

function buildReporterNamespace(): string {
	return `${WPK_NAMESPACE}.cli.init`;
}

/**
 * Options for building the `init` command.
 *
 * @category Init Command
 */
export interface BuildInitCommandOptions {
	/** Optional: Custom workspace builder function. */
	readonly buildWorkspace?: typeof buildWorkspace;
	/** Optional: Custom reporter builder function. */
	readonly buildReporter?: typeof buildReporter;
	/** Optional: Custom workflow runner function. */
	readonly runWorkflow?: typeof runInitWorkflow;
	/** Optional: Custom git repository checker function. */
	readonly checkGitRepository?: typeof isGitRepository;
}

/**
 * Represents an instance of the `init` command.
 *
 * @category Init Command
 */
export type InitCommandInstance = Command & {
	/** The name of the project. */
	name?: string;
	/** The template to use for scaffolding. */
	template?: string;
	/** Whether to force overwrite existing files. */
	force: boolean;
	/** Whether to enable verbose logging. */
	verbose: boolean;
	/** Whether to prefer registry versions for dependencies. */
	preferRegistryVersions: boolean;
	/** A summary of the initialization process. */
	summary: string | null;
	/** The manifest of files created or modified. */
	manifest: FileManifest | null;
	/** The source of dependencies used. */
	dependencySource: string | null;
};

/**
 * The constructor type for the `init` command.
 *
 * @category Init Command
 */
export type InitCommandConstructor = new () => InitCommandInstance;

interface InitDependencies {
	readonly buildWorkspace: typeof buildWorkspace;
	readonly buildReporter: typeof buildReporter;
	readonly runWorkflow: typeof runInitWorkflow;
	readonly checkGitRepository: typeof isGitRepository;
}

function mergeDependencies(options: BuildInitCommandOptions): InitDependencies {
	return {
		buildWorkspace,
		buildReporter,
		runWorkflow: runInitWorkflow,
		checkGitRepository: isGitRepository,
		...options,
	} satisfies InitDependencies;
}

/**
 * Builds the `init` command for the CLI.
 *
 * This command is responsible for initializing a new WP Kernel project by
 * scaffolding configuration files, entry points, and linting presets.
 *
 * @category Init Command
 * @param    options - Options for building the init command, including dependencies.
 * @returns The `InitCommandConstructor` class.
 */
export function buildInitCommand(
	options: BuildInitCommandOptions = {}
): InitCommandConstructor {
	const dependencies = mergeDependencies(options);

	class InitCommand extends Command {
		static override paths = [['init']];

		static override usage = Command.Usage({
			description:
				'Initialise a WP Kernel project by scaffolding config, entrypoint, and linting presets.',
			examples: [
				['Scaffold project files', 'wpk init --name=my-plugin'],
				['Overwrite existing files', 'wpk init --force'],
			],
		});

		name = Option.String('--name', {
			description: 'Project slug used for namespace/package defaults',
			required: false,
		});

		template = Option.String('--template', {
			description:
				'Reserved for future templates (plugin/theme/headless)',
			required: false,
		});

		force = Option.Boolean('--force', false);
		verbose = Option.Boolean('--verbose', false);
		preferRegistryVersions = Option.Boolean(
			'--prefer-registry-versions',
			false
		);

		public summary: string | null = null;
		public manifest: FileManifest | null = null;
		public dependencySource: string | null = null;

		override async execute(): Promise<WPKExitCode> {
			try {
				const runtime = this.createRuntime();

				await this.warnWhenGitMissing(
					runtime.workspace,
					runtime.reporter
				);

				const result = await runtime.runWorkflow();

				this.manifest = result.manifest;
				this.summary = result.summaryText;
				this.dependencySource = result.dependencySource;

				this.context.stdout.write(result.summaryText);

				return WPK_EXIT_CODES.SUCCESS;
			} catch (error) {
				this.summary = null;
				this.manifest = null;
				this.dependencySource = null;

				if (WPKernelError.isWPKernelError(error)) {
					this.context.stderr.write(
						formatInitWorkflowError('init', error)
					);
					return WPK_EXIT_CODES.VALIDATION_ERROR;
				}

				throw error;
			}
		}

		private createRuntime(): InitCommandRuntimeResult {
			const workspaceRoot = resolveCommandCwd(this.context);

			return createInitCommandRuntime(
				{
					buildWorkspace: dependencies.buildWorkspace,
					buildReporter: dependencies.buildReporter,
					runWorkflow: dependencies.runWorkflow,
				},
				{
					reporterNamespace: buildReporterNamespace(),
					workspaceRoot,
					projectName: this.name,
					template: this.template,
					force: this.force,
					verbose: this.verbose,
					preferRegistryVersions: this.preferRegistryVersions,
					env: {
						WPK_PREFER_REGISTRY_VERSIONS:
							process.env.WPK_PREFER_REGISTRY_VERSIONS,
						REGISTRY_URL: process.env.REGISTRY_URL,
					},
				}
			);
		}

		private async warnWhenGitMissing(
			workspace: Workspace,
			reporter: Reporter
		): Promise<void> {
			try {
				const hasGit = await dependencies.checkGitRepository(
					workspace.root
				);
				if (!hasGit) {
					reporter.warn(
						'Git repository not detected. Run `git init` to enable version control before committing generated files.'
					);
				}
			} catch (error) {
				if (WPKernelError.isWPKernelError(error)) {
					throw error;
				}

				throw new WPKernelError('DeveloperError', {
					message:
						'Unable to verify git repository status for init command.',
					context: {
						error: String(
							(error as { message?: unknown }).message ?? error
						),
					},
				});
			}
		}
	}

	return InitCommand as InitCommandConstructor;
}
