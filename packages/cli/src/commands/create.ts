import path from 'node:path';
import { Command, Option } from 'clipanion';
import { createReporter as buildReporter } from '@wpkernel/core/reporter';
import { WPKernelError } from '@wpkernel/core/error';
import {
	WPK_NAMESPACE,
	WPK_EXIT_CODES,
	type WPKExitCode,
} from '@wpkernel/core/contracts';
import type { Reporter } from '@wpkernel/core/reporter';
import type { Workspace, FileManifest } from '../workspace';
import { buildWorkspace, ensureCleanDirectory } from '../workspace';
import { runInitWorkflow } from './init/workflow';
import { initialiseGitRepository, isGitRepository } from './init/git';
import {
	installNodeDependencies,
	installComposerDependencies,
} from './init/installers';
import {
	createInitCommandRuntime,
	formatInitWorkflowError,
	resolveCommandCwd,
	type InitCommandRuntimeResult,
} from './init/command-runtime';

function buildReporterNamespace(): string {
	return `${WPK_NAMESPACE}.cli.create`;
}

/**
 * Options for building the `create` command.
 *
 * @category Create Command
 */
export interface BuildCreateCommandOptions {
	/** Optional: Custom workspace builder function. */
	readonly buildWorkspace?: typeof buildWorkspace;
	/** Optional: Custom reporter builder function. */
	readonly buildReporter?: typeof buildReporter;
	/** Optional: Custom workflow runner function. */
	readonly runWorkflow?: typeof runInitWorkflow;
	/** Optional: Custom git repository checker function. */
	readonly checkGitRepository?: typeof isGitRepository;
	/** Optional: Custom git repository initializer function. */
	readonly initGitRepository?: typeof initialiseGitRepository;
	/** Optional: Custom clean directory enforcer function. */
	readonly ensureCleanDirectory?: typeof ensureCleanDirectory;
	/** Optional: Custom Node.js dependency installer function. */
	readonly installNodeDependencies?: typeof installNodeDependencies;
	/** Optional: Custom Composer dependency installer function. */
	readonly installComposerDependencies?: typeof installComposerDependencies;
}

/**
 * Represents an instance of the `create` command.
 *
 * @category Create Command
 */
export type CreateCommandInstance = Command & {
	/** The target directory for the new project. */
	target?: string;
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
	/** Whether to skip dependency installation. */
	skipInstall: boolean;
	/** A summary of the creation process. */
	summary: string | null;
	/** The manifest of files created or modified. */
	manifest: FileManifest | null;
	/** The source of dependencies used. */
	dependencySource: string | null;
};

/**
 * The constructor type for the `create` command.
 *
 * @category Create Command
 */
export type CreateCommandConstructor = new () => CreateCommandInstance;

interface CreateDependencies {
	readonly buildWorkspace: typeof buildWorkspace;
	readonly buildReporter: typeof buildReporter;
	readonly runWorkflow: typeof runInitWorkflow;
	readonly checkGitRepository: typeof isGitRepository;
	readonly initGitRepository: typeof initialiseGitRepository;
	readonly ensureCleanDirectory: typeof ensureCleanDirectory;
	readonly installNodeDependencies: typeof installNodeDependencies;
	readonly installComposerDependencies: typeof installComposerDependencies;
}

function mergeDependencies(
	options: BuildCreateCommandOptions
): CreateDependencies {
	return {
		buildWorkspace,
		buildReporter,
		runWorkflow: runInitWorkflow,
		checkGitRepository: isGitRepository,
		initGitRepository: initialiseGitRepository,
		ensureCleanDirectory,
		installNodeDependencies,
		installComposerDependencies,
		...options,
	} satisfies CreateDependencies;
}

function resolveTargetDirectory(base: string, target?: string): string {
	const candidate =
		typeof target === 'string' && target.length > 0 ? target : '.';
	return path.resolve(base, candidate);
}

/**
 * Builds the `create` command for the CLI.
 *
 * This command is responsible for creating a new WP Kernel project, including
 * scaffolding files, initializing a Git repository, and installing dependencies.
 *
 * @category Create Command
 * @param    options - Options for building the create command, including dependencies.
 * @returns The `CreateCommandConstructor` class.
 */
export function buildCreateCommand(
	options: BuildCreateCommandOptions = {}
): CreateCommandConstructor {
	const dependencies = mergeDependencies(options);

	class CreateCommand extends Command {
		static override paths = [['create']];

		static override usage = Command.Usage({
			description:
				'Create a new WP Kernel project, initialise git, and install dependencies.',
			examples: [
				['Create project in current directory', 'wpk create'],
				['Create project in ./demo-plugin', 'wpk create demo-plugin'],
				[
					'Create without installing dependencies',
					'wpk create demo --skip-install',
				],
			],
		});

		target = Option.String({ name: 'directory', required: false });
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
		skipInstall = Option.Boolean('--skip-install', false);

		public summary: string | null = null;
		public manifest: FileManifest | null = null;
		public dependencySource: string | null = null;

		override async execute(): Promise<WPKExitCode> {
			try {
				const base = resolveCommandCwd(this.context);
				const targetValue =
					typeof this.target === 'string' && this.target.length > 0
						? this.target
						: undefined;
				const targetRoot = resolveTargetDirectory(base, targetValue);

				const runtime = this.createRuntime(targetRoot);

				await dependencies.ensureCleanDirectory({
					workspace: runtime.workspace,
					directory: targetRoot,
					force: this.force === true,
					create: true,
					reporter: runtime.reporter,
				});

				const result = await runtime.runWorkflow();

				this.summary = result.summaryText;
				this.manifest = result.manifest;
				this.dependencySource = result.dependencySource;

				await this.ensureGitRepository(
					runtime.workspace,
					runtime.reporter
				);
				await this.installDependencies(
					runtime.workspace,
					runtime.reporter
				);

				this.context.stdout.write(result.summaryText);
				return WPK_EXIT_CODES.SUCCESS;
			} catch (error) {
				this.summary = null;
				this.manifest = null;
				this.dependencySource = null;

				if (WPKernelError.isWPKernelError(error)) {
					this.context.stderr.write(
						formatInitWorkflowError('create', error)
					);
					return WPK_EXIT_CODES.VALIDATION_ERROR;
				}

				throw error;
			}
		}

		private createRuntime(targetRoot: string): InitCommandRuntimeResult {
			return createInitCommandRuntime(
				{
					buildWorkspace: dependencies.buildWorkspace,
					buildReporter: dependencies.buildReporter,
					runWorkflow: dependencies.runWorkflow,
				},
				{
					reporterNamespace: buildReporterNamespace(),
					workspaceRoot: targetRoot,
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

		private async ensureGitRepository(
			workspace: Workspace,
			reporter: Reporter
		): Promise<void> {
			const hasGit = await dependencies.checkGitRepository(
				workspace.root
			);
			if (hasGit) {
				return;
			}

			reporter.info('Initialising git repository.');
			await dependencies.initGitRepository(workspace.root);
		}

		private async installDependencies(
			workspace: Workspace,
			reporter: Reporter
		): Promise<void> {
			if (this.skipInstall === true) {
				reporter.warn(
					'Skipping dependency installation (--skip-install provided).'
				);
				return;
			}

			reporter.info('Installing npm dependencies...');
			await dependencies.installNodeDependencies(workspace.root);

			reporter.info('Installing composer dependencies...');
			await dependencies.installComposerDependencies(workspace.root);
		}
	}

	return CreateCommand as CreateCommandConstructor;
}
