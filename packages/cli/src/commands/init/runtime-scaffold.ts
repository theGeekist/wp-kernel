import { Command, Option } from 'clipanion';
import { WPKernelError } from '@wpkernel/core/error';
import { WPK_EXIT_CODES, type WPKExitCode } from '@wpkernel/core/contracts';
import type { Reporter } from '@wpkernel/core/reporter';
import type {
	FileManifest,
	Workspace,
	ensureGeneratedPhpClean,
} from '../../workspace';
import {
	createInitCommandRuntime,
	formatInitWorkflowError,
	resolveCommandCwd,
	type InitCommandRuntimeDependencies,
	type InitCommandRuntimeOptions,
	type InitCommandRuntimeResult,
} from './command-runtime';
import { assertReadinessRun, type ReadinessKey } from '../../dx';
import type { DefaultReadinessHelperOverrides } from '../../dx/readiness/configure';
import type { InitWorkflowResult } from './workflow';

type CommandName = 'create' | 'init';

export interface InitCommandScaffoldDependencies
	extends InitCommandRuntimeDependencies {
	readonly ensureGeneratedPhpClean: typeof ensureGeneratedPhpClean;
}

export interface InitCommandScaffoldConfiguration {
	readonly commandName: CommandName;
	readonly reporterNamespace: string;
	readonly dependencies: InitCommandScaffoldDependencies;
}

export interface InitCommandScaffoldInstance extends Command {
	name?: string;
	template?: string;
	force: boolean;
	verbose: boolean;
	preferRegistryVersions: boolean;
	yes: boolean;
	summary: string | null;
	manifest: FileManifest | null;
	dependencySource: string | null;
}

export interface InitCommandScaffoldContext {
	readonly workspaceRoot: string;
	readonly cwd: string;
}

type InitCommandScaffoldClass = typeof Command & {
	readonly scaffoldConfiguration: InitCommandScaffoldConfiguration;
};

export abstract class InitCommandScaffoldBase
	extends Command
	implements InitCommandScaffoldInstance
{
	name = Option.String('--name', {
		description: 'Project slug used for namespace/package defaults',
		required: false,
	});

	template = Option.String('--template', {
		description: 'Reserved for future templates (plugin/theme/headless)',
		required: false,
	});

	force = Option.Boolean('--force', false);
	verbose = Option.Boolean('--verbose', false);
	preferRegistryVersions = Option.Boolean(
		'--prefer-registry-versions',
		false
	);
	yes = Option.Boolean('--yes', false);

	summary: string | null = null;
	manifest: FileManifest | null = null;
	dependencySource: string | null = null;

	protected resolveWorkspaceRoot(cwd: string): string {
		return cwd;
	}

	protected buildReadinessOverrides():
		| DefaultReadinessHelperOverrides
		| undefined {
		if (this.yes !== true) {
			return undefined;
		}

		return {
			workspaceHygiene: {
				ensureClean: async ({
					workspace,
					reporter,
				}: {
					workspace: Workspace;
					reporter: Reporter;
				}) =>
					this.dependencies.ensureGeneratedPhpClean({
						workspace,
						reporter,
						yes: true,
					}),
			},
		} satisfies DefaultReadinessHelperOverrides;
	}

	protected buildReadinessOptions():
		| InitCommandRuntimeOptions['readiness']
		| undefined {
		const overrides = this.buildReadinessOverrides();
		if (!overrides) {
			return undefined;
		}

		return { helperOverrides: overrides };
	}

	protected filterReadinessKeys(
		keys: readonly ReadinessKey[]
	): ReadonlyArray<ReadinessKey> {
		return [...keys];
	}

	protected async prepare(
		_runtime: InitCommandRuntimeResult,
		_context: InitCommandScaffoldContext
	): Promise<void> {
		// No-op by default.
	}

	protected async afterWorkflow(
		_result: InitWorkflowResult,
		_runtime: InitCommandRuntimeResult,
		_context: InitCommandScaffoldContext
	): Promise<void> {
		// No-op by default.
	}

	protected async afterReadiness(
		_runtime: InitCommandRuntimeResult,
		_context: InitCommandScaffoldContext
	): Promise<void> {
		// No-op by default.
	}

	override async execute(): Promise<WPKExitCode> {
		try {
			const cwd = resolveCommandCwd(this.context);
			const workspaceRoot = this.resolveWorkspaceRoot(cwd);

			const runtime = createInitCommandRuntime(this.dependencies, {
				reporterNamespace: this.reporterNamespace,
				workspaceRoot,
				cwd,
				projectName: this.name,
				template: this.template,
				force: this.force,
				verbose: this.verbose,
				preferRegistryVersions: this.preferRegistryVersions,
				readiness: this.buildReadinessOptions(),
			});

			const context: InitCommandScaffoldContext = {
				workspaceRoot,
				cwd,
			};

			await this.prepare(runtime, context);
			const result = await runtime.runWorkflow();

			this.summary = result.summaryText;
			this.manifest = result.manifest;
			this.dependencySource = result.dependencySource;

			await this.afterWorkflow(result, runtime, context);
			await this.runReadiness(runtime);
			await this.afterReadiness(runtime, context);

			this.context.stdout.write(result.summaryText);
			return WPK_EXIT_CODES.SUCCESS;
		} catch (error) {
			this.summary = null;
			this.manifest = null;
			this.dependencySource = null;

			if (WPKernelError.isWPKernelError(error)) {
				this.context.stderr.write(
					formatInitWorkflowError(this.commandName, error)
				);
				return WPK_EXIT_CODES.VALIDATION_ERROR;
			}

			throw error;
		}
	}

	private async runReadiness(
		runtime: InitCommandRuntimeResult
	): Promise<void> {
		const keys = this.filterReadinessKeys(runtime.readiness.defaultKeys);
		if (keys.length === 0) {
			return;
		}

		const result = await runtime.readiness.run(keys);
		assertReadinessRun(result);
	}

	private get dependencies(): InitCommandScaffoldDependencies {
		return this.scaffold.dependencies;
	}

	private get reporterNamespace(): string {
		return this.scaffold.reporterNamespace;
	}

	private get commandName(): CommandName {
		return this.scaffold.commandName;
	}

	private get scaffold(): InitCommandScaffoldConfiguration {
		return (this.constructor as unknown as InitCommandScaffoldClass)
			.scaffoldConfiguration;
	}
}

export function createInitCommandScaffold(
	configuration: InitCommandScaffoldConfiguration
): typeof InitCommandScaffoldBase {
	return class InitCommandScaffold extends InitCommandScaffoldBase {
		static readonly scaffoldConfiguration = configuration;
	};
}
