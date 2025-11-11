import path from 'node:path';
import { Command, Option } from 'clipanion';
import { WPK_NAMESPACE, type WPKExitCode } from '@wpkernel/core/contracts';
import { createReporterCLI as buildReporter } from '../utils/reporter.js';
import {
	buildWorkspace,
	ensureCleanDirectory,
	ensureGeneratedPhpClean,
} from '../workspace';
import { runInitWorkflow } from './init/workflow';
import { installNodeDependencies } from './init/installers';
import { type InitCommandRuntimeDependencies } from './init/command-runtime';
import {
	InitCommandBase,
	type InitCommandContext,
	type InitCommandHooks,
} from './init/shared';
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
export type CreateCommandInstance = InitCommandBase & {
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
	readonly runtime: InitCommandRuntimeDependencies;
	readonly ensureGeneratedPhpClean: typeof ensureGeneratedPhpClean;
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
		runtime: {
			buildWorkspace: buildWorkspaceOverride,
			buildReporter: buildReporterOverride,
			runWorkflow: runWorkflowOverride,
			buildReadinessRegistry,
		},
		ensureGeneratedPhpClean,
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

	class CreateCommand extends InitCommandBase {
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

		override async execute(): Promise<WPKExitCode> {
			return this.executeInitCommand({
				commandName: 'create',
				reporterNamespace: buildReporterNamespace(),
				dependencies: dependencies.runtime,
				ensureGeneratedPhpClean: dependencies.ensureGeneratedPhpClean,
				hooks: buildCreateCommandHooks(this, dependencies),
			});
		}
	}

	return CreateCommand as CreateCommandConstructor;
}

function buildCreateCommandHooks(
	command: CreateCommandInstance,
	dependencies: CreateDependencies
): InitCommandHooks {
	return {
		resolveWorkspaceRoot: (cwd: string) =>
			resolveTargetDirectory(
				cwd,
				typeof command.target === 'string' && command.target.length > 0
					? command.target
					: '.'
			),
		filterReadinessKeys: (keys: readonly ReadinessKey[]) => {
			if (command.skipInstall !== true) {
				return keys;
			}

			const skipped = new Set<ReadinessKey>(['composer', 'tsx-runtime']);
			return keys.filter((key) => !skipped.has(key));
		},
		prepare: async (runtime, context: InitCommandContext) => {
			await dependencies.ensureCleanDirectory({
				workspace: runtime.workspace,
				directory: context.workspaceRoot,
				force: command.force === true,
				create: true,
				reporter: runtime.reporter,
			});
		},
		afterReadiness: async (runtime) => {
			if (command.skipInstall === true) {
				runtime.reporter.warn(
					'Skipping dependency installation (--skip-install provided).'
				);
				return;
			}

			runtime.reporter.info('Installing npm dependencies...');
			await dependencies.installNodeDependencies(runtime.workspace.root);
		},
	} satisfies InitCommandHooks;
}
