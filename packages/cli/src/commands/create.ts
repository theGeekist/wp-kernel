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
import type { Workspace, FileManifest } from '../next/workspace';
import { buildWorkspace, ensureCleanDirectory } from '../next/workspace';
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

export interface BuildCreateCommandOptions {
	readonly buildWorkspace?: typeof buildWorkspace;
	readonly buildReporter?: typeof buildReporter;
	readonly runWorkflow?: typeof runInitWorkflow;
	readonly checkGitRepository?: typeof isGitRepository;
	readonly initGitRepository?: typeof initialiseGitRepository;
	readonly ensureCleanDirectory?: typeof ensureCleanDirectory;
	readonly installNodeDependencies?: typeof installNodeDependencies;
	readonly installComposerDependencies?: typeof installComposerDependencies;
}

export type CreateCommandInstance = Command & {
	target?: string;
	name?: string;
	template?: string;
	force: boolean;
	verbose: boolean;
	preferRegistryVersions: boolean;
	skipInstall: boolean;
	summary: string | null;
	manifest: FileManifest | null;
	dependencySource: string | null;
};

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

export function buildCreateCommand(
	options: BuildCreateCommandOptions = {}
): CreateCommandConstructor {
	const dependencies = mergeDependencies(options);

	class NextCreateCommand extends Command {
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

	return NextCreateCommand as CreateCommandConstructor;
}
