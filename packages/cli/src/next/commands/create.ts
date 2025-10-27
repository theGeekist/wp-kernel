import path from 'node:path';
import { Command, Option } from 'clipanion';
import { createReporter as buildReporter } from '@wpkernel/core/reporter';
import { KernelError } from '@wpkernel/core/error';
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
import type { InitWorkflowOptions, InitWorkflowResult } from './init/workflow';

function buildReporterNamespace(): string {
	return `${WPK_NAMESPACE}.cli.next.create`;
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

function resolveBaseDirectory(context: Command['context']): string {
	const cwd = (context as { cwd?: () => string }).cwd;
	return typeof cwd === 'function' ? cwd() : process.cwd();
}

function resolveTargetDirectory(base: string, target?: string): string {
	const candidate =
		typeof target === 'string' && target.length > 0 ? target : '.';
	return path.resolve(base, candidate);
}

function formatErrorMessage(error: KernelError): string {
	const collisions = Array.isArray(
		(error.data as { collisions?: unknown })?.collisions
	)
		? ((error.data as { collisions?: string[] }).collisions ?? [])
		: [];

	const lines = [`[wpk] create failed: ${error.message}`];

	if (collisions.length > 0) {
		lines.push('Conflicting files:');
		for (const file of collisions) {
			lines.push(`  - ${file}`);
		}
	}

	const pathEntry = (error.data as { path?: unknown })?.path;
	if (typeof pathEntry === 'string' && pathEntry.length > 0) {
		lines.push(`  - ${pathEntry}`);
	}

	return `${lines.join('\n')}\n`;
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
			const reporter = dependencies.buildReporter({
				namespace: buildReporterNamespace(),
				level: 'info',
				enabled: process.env.NODE_ENV !== 'test',
			});

			try {
				const base = resolveBaseDirectory(this.context);
				const targetValue =
					typeof this.target === 'string' && this.target.length > 0
						? this.target
						: undefined;
				const targetRoot = resolveTargetDirectory(base, targetValue);

				const workspace = dependencies.buildWorkspace(targetRoot);
				await dependencies.ensureCleanDirectory({
					workspace,
					directory: targetRoot,
					force: this.force === true,
					create: true,
					reporter,
				});

				const projectName =
					typeof this.name === 'string' && this.name.length > 0
						? this.name
						: undefined;
				const templateOption =
					typeof this.template === 'string' &&
					this.template.length > 0
						? this.template
						: undefined;
				const force = this.force === true;
				const verbose = this.verbose === true;
				const preferRegistry = this.preferRegistryVersions === true;

				const result = await this.runWorkflow({
					workspace,
					reporter,
					projectName,
					template: templateOption,
					force,
					verbose,
					preferRegistryVersionsFlag: preferRegistry,
					env: {
						WPK_PREFER_REGISTRY_VERSIONS:
							process.env.WPK_PREFER_REGISTRY_VERSIONS,
						REGISTRY_URL: process.env.REGISTRY_URL,
					},
				});

				this.summary = result.summaryText;
				this.manifest = result.manifest;
				this.dependencySource = result.dependencySource;

				await this.ensureGitRepository(workspace, reporter);
				await this.installDependencies(workspace, reporter);

				this.context.stdout.write(result.summaryText);
				return WPK_EXIT_CODES.SUCCESS;
			} catch (error) {
				this.summary = null;
				this.manifest = null;
				this.dependencySource = null;

				if (KernelError.isKernelError(error)) {
					this.context.stderr.write(formatErrorMessage(error));
					return WPK_EXIT_CODES.VALIDATION_ERROR;
				}

				throw error;
			}
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

		private runWorkflow(
			workflowOptions: InitWorkflowOptions
		): Promise<InitWorkflowResult> {
			return dependencies.runWorkflow(workflowOptions);
		}
	}

	return NextCreateCommand as CreateCommandConstructor;
}
