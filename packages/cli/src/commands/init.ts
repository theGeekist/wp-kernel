import { Command, Option } from 'clipanion';
import { createReporter as buildReporter } from '@wpkernel/core/reporter';
import { WPKernelError } from '@wpkernel/core/error';
import {
	WPK_NAMESPACE,
	WPK_EXIT_CODES,
	type WPKExitCode,
} from '@wpkernel/core/contracts';
import type { Reporter } from '@wpkernel/core/reporter';
import type { Workspace, FileManifest } from '../next/workspace';
import { buildWorkspace } from '../next/workspace';
import { runInitWorkflow } from './init/workflow';
import { isGitRepository } from './init/git';
import {
	createInitCommandRuntime,
	formatInitWorkflowError,
	resolveCommandCwd,
	type InitCommandRuntimeResult,
} from './init/command-runtime';

function buildReporterNamespace(): string {
	return `${WPK_NAMESPACE}.cli.init`;
}

export interface BuildInitCommandOptions {
	readonly buildWorkspace?: typeof buildWorkspace;
	readonly buildReporter?: typeof buildReporter;
	readonly runWorkflow?: typeof runInitWorkflow;
	readonly checkGitRepository?: typeof isGitRepository;
}

export type InitCommandInstance = Command & {
	name?: string;
	template?: string;
	force: boolean;
	verbose: boolean;
	preferRegistryVersions: boolean;
	summary: string | null;
	manifest: FileManifest | null;
	dependencySource: string | null;
};

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

export function buildInitCommand(
	options: BuildInitCommandOptions = {}
): InitCommandConstructor {
	const dependencies = mergeDependencies(options);

	class NextInitCommand extends Command {
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

	return NextInitCommand as InitCommandConstructor;
}
