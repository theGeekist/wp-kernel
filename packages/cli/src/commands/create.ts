import path from 'node:path';
import { Command, Option } from 'clipanion';
import { WPK_NAMESPACE, type WPKExitCode } from '@wpkernel/core/contracts';
import { WPKernelError } from '@wpkernel/core/error';
import { createReporterCLI as buildReporter } from '../utils/reporter.js';
import { buildWorkspace, ensureCleanDirectory } from '../workspace';
import { runInitWorkflow } from './init/workflow';
import {
	installNodeDependencies,
	installComposerDependencies,
} from './init/installers';
import { type InitCommandRuntimeDependencies } from './init/command-runtime';
import {
	InitCommandBase,
	type InitCommandContext,
	type InitCommandHooks,
} from './init/shared';
import {
	type ReadinessHelperDescriptor,
	type ReadinessHelperFactory,
	type ReadinessKey,
} from '../dx';
import { loadWPKernelConfig } from '../config';
import type { LoadedWPKernelConfig } from '../config/types';

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
	/** Optional: Custom kernel config loader. */
	readonly loadWPKernelConfig?: () => Promise<LoadedWPKernelConfig>;
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
 * @category Commands
 */
export type CreateCommandInstance = InitCommandBase & {
	/** The target directory for the new project. */
	target?: string;
};

/**
 * The constructor type for the `create` command.
 *
 * @category Commands
 */
export type CreateCommandConstructor = new () => CreateCommandInstance;

interface CreateDependencies {
	readonly runtime: InitCommandRuntimeDependencies;
	readonly ensureCleanDirectory: typeof ensureCleanDirectory;
	readonly installNodeDependencies: typeof installNodeDependencies;
	readonly installComposerDependencies: typeof installComposerDependencies;
	readonly loadWPKernelConfig: () => Promise<LoadedWPKernelConfig>;
}

function mergeDependencies(
	options: BuildCreateCommandOptions
): CreateDependencies {
	const {
		buildWorkspace: buildWorkspaceOverride = buildWorkspace,
		buildReporter: buildReporterOverride = buildReporter,
		runWorkflow: runWorkflowOverride = runInitWorkflow,
		buildReadinessRegistry,
		loadWPKernelConfig: loadWPKernelConfigOverride = loadWPKernelConfig,
		ensureCleanDirectory:
			ensureCleanDirectoryOverride = ensureCleanDirectory,
		installNodeDependencies:
			installNodeDependenciesOverride = installNodeDependencies,
		installComposerDependencies:
			installComposerDependenciesOverride = installComposerDependencies,
	} = options;

	return {
		runtime: {
			buildWorkspace: buildWorkspaceOverride,
			buildReporter: buildReporterOverride,
			runWorkflow: runWorkflowOverride,
			buildReadinessRegistry,
		},
		ensureCleanDirectory: ensureCleanDirectoryOverride,
		installNodeDependencies: installNodeDependenciesOverride,
		installComposerDependencies: installComposerDependenciesOverride,
		loadWPKernelConfig: loadWPKernelConfigOverride,
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
			],
		});

		target = Option.String({ name: 'directory', required: false });

		override async execute(): Promise<WPKExitCode> {
			const readinessHelperFactories =
				await resolveProjectReadinessHelperFactories(
					dependencies.loadWPKernelConfig
				);

			return this.executeInitCommand({
				commandName: 'create',
				reporterNamespace: buildReporterNamespace(),
				dependencies: dependencies.runtime,
				hooks: buildCreateCommandHooks(
					this,
					dependencies,
					readinessHelperFactories
				),
				installDependencies: true,
				installers: {
					installNodeDependencies:
						dependencies.installNodeDependencies,
					installComposerDependencies:
						dependencies.installComposerDependencies,
				},
			});
		}
	}

	return CreateCommand as CreateCommandConstructor;
}

function buildCreateCommandHooks(
	command: CreateCommandInstance,
	dependencies: CreateDependencies,
	helperFactories?: ReadonlyArray<ReadinessHelperFactory>
): InitCommandHooks {
	return {
		buildReadinessOptions: () =>
			helperFactories && helperFactories.length > 0
				? { helperFactories }
				: undefined,
		resolveWorkspaceRoot: (cwd: string) =>
			resolveTargetDirectory(
				cwd,
				typeof command.target === 'string' && command.target.length > 0
					? command.target
					: '.'
			),
		filterReadinessKeys: (
			keys: readonly ReadinessKey[],
			helpers: readonly ReadinessHelperDescriptor[]
		) => {
			const allowed = new Set(keys);
			const scoped = helpers.filter((helper) => {
				const scopes = helper.metadata.scopes;
				if (!scopes || scopes.length === 0) {
					return true;
				}

				return scopes.includes('create');
			});

			const ordered = scoped
				.map((helper) => helper.key)
				.filter((key) => allowed.has(key));

			return ordered;
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
	} satisfies InitCommandHooks;
}

async function resolveProjectReadinessHelperFactories(
	loadConfig: CreateDependencies['loadWPKernelConfig']
): Promise<ReadonlyArray<ReadinessHelperFactory> | undefined> {
	try {
		const loaded = await loadConfig();
		return loaded.config.readiness?.helpers;
	} catch (error) {
		if (shouldIgnoreMissingConfig(error)) {
			return undefined;
		}

		throw error;
	}
}

const MISSING_CONFIG_MESSAGE = 'Unable to locate a wpk config';

function shouldIgnoreMissingConfig(error: unknown): boolean {
	if (!WPKernelError.isWPKernelError(error)) {
		return false;
	}

	return (
		error.code === 'DeveloperError' &&
		typeof error.message === 'string' &&
		error.message.includes(MISSING_CONFIG_MESSAGE)
	);
}
