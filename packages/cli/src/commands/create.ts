import path from 'node:path';
import { Command, Option } from 'clipanion';
import { createReporterCLI as buildReporter } from '../utils/reporter.js';
import { WPK_NAMESPACE } from '@wpkernel/core/contracts';
import {
	buildWorkspace,
	ensureCleanDirectory,
	ensureGeneratedPhpClean,
} from '../workspace';
import { runInitWorkflow } from './init/workflow';
import { installNodeDependencies } from './init/installers';
import type {
	InitCommandRuntimeDependencies,
	InitCommandRuntimeResult,
} from './init/command-runtime';
import {
	createInitCommandScaffold,
	type InitCommandScaffoldContext,
	type InitCommandScaffoldDependencies,
	type InitCommandScaffoldInstance,
} from './init/runtime-scaffold';
import type { ReadinessKey } from '../dx';

// Re-export types from sub-modules for TypeDoc
export type { InstallerDependencies } from './init/installers';

function buildReporterNamespace(): string {
	return `${WPK_NAMESPACE}.cli.create`;
}

/**
 * Options for building the `create` command.
 *
 * @category Commands
 */
export interface BuildCreateCommandOptions {
	/** Optional: Custom workspace builder function. */
	readonly buildWorkspace?: typeof buildWorkspace;
	/** Optional: Custom reporter builder function. */
	readonly buildReporter?: typeof buildReporter;
	/** Optional: Custom workflow runner function. */
	readonly runWorkflow?: typeof runInitWorkflow;
	/** Optional: Custom readiness registry builder. */
	readonly buildReadinessRegistry?: InitCommandRuntimeDependencies['buildReadinessRegistry'];
	/** Optional: Custom clean directory enforcer function. */
	readonly ensureCleanDirectory?: typeof ensureCleanDirectory;
	/** Optional: Custom Node.js dependency installer function. */
	readonly installNodeDependencies?: typeof installNodeDependencies;
}

/**
 * Represents an instance of the `create` command.
 *
 * @category Commands
 */
export type CreateCommandInstance = InitCommandScaffoldInstance & {
	/** The target directory for the new project. */
	target?: string;
	/** Whether to skip dependency installation. */
	skipInstall: boolean;
};

/**
 * The constructor type for the `create` command.
 *
 * @category Commands
 */
export type CreateCommandConstructor = new () => CreateCommandInstance;

interface CreateDependencies {
	readonly scaffold: InitCommandScaffoldDependencies;
	readonly ensureCleanDirectory: typeof ensureCleanDirectory;
	readonly installNodeDependencies: typeof installNodeDependencies;
}

function mergeDependencies(
	options: BuildCreateCommandOptions
): CreateDependencies {
	const {
		buildWorkspace: buildWorkspaceOverride = buildWorkspace,
		buildReporter: buildReporterOverride = buildReporter,
		runWorkflow: runWorkflowOverride = runInitWorkflow,
		buildReadinessRegistry,
		ensureCleanDirectory:
			ensureCleanDirectoryOverride = ensureCleanDirectory,
		installNodeDependencies:
			installNodeDependenciesOverride = installNodeDependencies,
	} = options;

	return {
		scaffold: {
			buildWorkspace: buildWorkspaceOverride,
			buildReporter: buildReporterOverride,
			runWorkflow: runWorkflowOverride,
			buildReadinessRegistry,
			ensureGeneratedPhpClean,
		},
		ensureCleanDirectory: ensureCleanDirectoryOverride,
		installNodeDependencies: installNodeDependenciesOverride,
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
 * This command is responsible for creating a new WPKernel project, including
 * scaffolding files, initializing a Git repository, and installing dependencies.
 *
 * @category Commands
 * @param    options - Options for building the create command, including dependencies.
 * @returns The `CreateCommandConstructor` class.
 */
export function buildCreateCommand(
	options: BuildCreateCommandOptions = {}
): CreateCommandConstructor {
	const dependencies = mergeDependencies(options);

	const BaseCommand = createInitCommandScaffold({
		commandName: 'create',
		reporterNamespace: buildReporterNamespace(),
		dependencies: dependencies.scaffold,
	});

	class CreateCommand extends BaseCommand {
		static override paths = [['create']];

		static override usage = Command.Usage({
			description:
				'Create a new WPKernel project, initialise git, and install dependencies.',
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
		skipInstall = Option.Boolean('--skip-install', false);
		protected override resolveWorkspaceRoot(cwd: string): string {
			const targetValue =
				typeof this.target === 'string' && this.target.length > 0
					? this.target
					: '.';
			return resolveTargetDirectory(cwd, targetValue);
		}

		protected override filterReadinessKeys(
			keys: readonly ReadinessKey[]
		): ReadonlyArray<ReadinessKey> {
			if (this.skipInstall === true) {
				const skipped = new Set<ReadinessKey>([
					'composer',
					'tsx-runtime',
				]);
				return keys.filter((key) => !skipped.has(key));
			}

			return keys;
		}

		protected override async prepare(
			runtime: InitCommandRuntimeResult,
			context: InitCommandScaffoldContext
		): Promise<void> {
			await dependencies.ensureCleanDirectory({
				workspace: runtime.workspace,
				directory: context.workspaceRoot,
				force: this.force === true,
				create: true,
				reporter: runtime.reporter,
			});
		}

		protected override async afterReadiness(
			runtime: InitCommandRuntimeResult,
			_context: InitCommandScaffoldContext
		): Promise<void> {
			if (this.skipInstall === true) {
				runtime.reporter.warn(
					'Skipping dependency installation (--skip-install provided).'
				);
				return;
			}

			runtime.reporter.info('Installing npm dependencies...');
			await dependencies.installNodeDependencies(runtime.workspace.root);
		}
	}

	return CreateCommand as CreateCommandConstructor;
}
