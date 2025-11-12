import { Command } from 'clipanion';
import { WPKernelError } from '@wpkernel/core/error';
import { WPK_NAMESPACE, type WPKExitCode } from '@wpkernel/core/contracts';
import { createReporterCLI as buildReporter } from '../utils/reporter.js';
import { buildWorkspace, ensureGeneratedPhpClean } from '../workspace';
import { runInitWorkflow } from './init/workflow';
import { isGitRepository } from './init/git';
import {
	type InitCommandRuntimeDependencies,
	type InitCommandRuntimeResult,
} from './init/command-runtime';
import { InitCommandBase } from './init/shared';
import type { ReadinessHelperDescriptor, ReadinessKey } from '../dx';

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
 * @category Commands
 */
export interface BuildInitCommandOptions {
	/** Optional: Custom workspace builder function. */
	readonly buildWorkspace?: typeof buildWorkspace;
	/** Optional: Custom reporter builder function. */
	readonly buildReporter?: typeof buildReporter;
	/** Optional: Custom workflow runner function. */
	readonly runWorkflow?: typeof runInitWorkflow;
	/** Optional: Custom readiness registry builder. */
	readonly buildReadinessRegistry?: InitCommandRuntimeDependencies['buildReadinessRegistry'];
	/** Optional: Custom git repository checker function. */
	readonly checkGitRepository?: typeof isGitRepository;
}

/**
 * Represents an instance of the `init` command.
 *
 * @category Commands
 */
export type InitCommandInstance = InitCommandBase;

/**
 * The constructor type for the `init` command.
 *
 * @category Commands
 */
export type InitCommandConstructor = new () => InitCommandInstance;

interface InitDependencies {
	readonly runtime: InitCommandRuntimeDependencies;
	readonly ensureGeneratedPhpClean: typeof ensureGeneratedPhpClean;
	readonly checkGitRepository: typeof isGitRepository;
}

function mergeDependencies(options: BuildInitCommandOptions): InitDependencies {
	const {
		buildWorkspace: buildWorkspaceOverride = buildWorkspace,
		buildReporter: buildReporterOverride = buildReporter,
		runWorkflow: runWorkflowOverride = runInitWorkflow,
		buildReadinessRegistry,
		checkGitRepository: checkGitRepositoryOverride = isGitRepository,
	} = options;

	return {
		runtime: {
			buildWorkspace: buildWorkspaceOverride,
			buildReporter: buildReporterOverride,
			runWorkflow: runWorkflowOverride,
			buildReadinessRegistry,
		},
		ensureGeneratedPhpClean,
		checkGitRepository: checkGitRepositoryOverride,
	} satisfies InitDependencies;
}

/**
 * Builds the `init` command for the CLI.
 *
 * This command is responsible for initializing a new WPKernel project by
 * scaffolding configuration files, entry points, and linting presets.
 *
 * @category Commands
 * @param    options - Options for building the init command, including dependencies.
 * @returns The `InitCommandConstructor` class.
 */
export function buildInitCommand(
	options: BuildInitCommandOptions = {}
): InitCommandConstructor {
	const dependencies = mergeDependencies(options);

	class InitCommand extends InitCommandBase {
		static override paths = [['init']];

		static override usage = Command.Usage({
			description:
				'Initialise a WPKernel project by scaffolding config, entrypoint, and linting presets.',
			examples: [
				['Scaffold project files', 'wpk init --name=my-plugin'],
				['Overwrite existing files', 'wpk init --force'],
			],
		});

		override async execute(): Promise<WPKExitCode> {
			return this.executeInitCommand({
				commandName: 'init',
				reporterNamespace: buildReporterNamespace(),
				dependencies: dependencies.runtime,
				ensureGeneratedPhpClean: dependencies.ensureGeneratedPhpClean,
				hooks: {
					filterReadinessKeys: (
						keys: readonly ReadinessKey[],
						helpers: readonly ReadinessHelperDescriptor[]
					) => {
						const allowed = new Set(keys);

						return helpers
							.filter((helper) => {
								const scopes = helper.metadata.scopes;
								if (!scopes || scopes.length === 0) {
									return true;
								}

								return scopes.includes('init');
							})
							.map((helper) => helper.key)
							.filter((key) => allowed.has(key));
					},
					prepare: async (runtime) => {
						await this.warnWhenGitMissing(
							runtime.workspace,
							runtime.reporter
						);
					},
				},
			});
		}

		private async warnWhenGitMissing(
			workspace: InitCommandRuntimeResult['workspace'],
			reporter: InitCommandRuntimeResult['reporter']
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
