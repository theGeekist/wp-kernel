import { Command, Option } from 'clipanion';
import { WPK_EXIT_CODES, type WPKExitCode } from '@wpkernel/core/contracts';
import { WPKernelError } from '@wpkernel/core/error';
import {
	createInitCommandRuntime,
	resolveCommandCwd,
	type InitCommandRuntimeDependencies,
	type InitCommandRuntimeOptions,
	type InitCommandRuntimeResult,
	formatInitWorkflowError,
} from './command-runtime';
import {
	assertReadinessRun,
	type ReadinessHelperDescriptor,
	type ReadinessKey,
} from '../../dx';
import type {
	InitWorkflowResult,
	InitWorkflowInstallers,
	PackageManager,
} from './types';

export interface InitCommandState {
	name?: string;
	template?: string;
	force: boolean;
	verbose: boolean;
	preferRegistryVersions: boolean;
	yes: boolean;
	allowDirty: boolean;
	readonly packageManager?: PackageManager;
	summary: string | null;
	manifest: InitWorkflowResult['manifest'] | null;
	dependencySource: string | null;
}

export abstract class InitCommandBase
	extends Command
	implements InitCommandState
{
	name = Option.String('--name,-n', {
		description: 'Project slug used for namespace/package defaults',
		required: false,
	});

	template = Option.String('--template,-t', {
		description: 'Reserved for future templates (plugin/theme/headless)',
		required: false,
	});

	force = Option.Boolean('--force,-f', false);
	verbose = Option.Boolean('--verbose,-v', false);
	preferRegistryVersions = Option.Boolean(
		'--prefer-registry-versions,-r',
		false
	);
	yes = Option.Boolean('--yes,-y', false);
	allowDirty = Option.Boolean('--allow-dirty,-D', false);
	private static readonly PACKAGE_MANAGER_VALUES: readonly PackageManager[] =
		['npm', 'pnpm', 'yarn'];

	private static parsePackageManager(value: string): PackageManager {
		const normalized = value.toLowerCase() as PackageManager;
		if (!InitCommandBase.PACKAGE_MANAGER_VALUES.includes(normalized)) {
			throw new Error(
				`Unsupported package manager "${value}". Expected one of ${InitCommandBase.PACKAGE_MANAGER_VALUES.join(', ')}.`
			);
		}

		return normalized;
	}

	private readonly packageManagerValue = Option.String(
		'--package-manager,-p,-pm',
		{
			description:
				'Package manager used when installing project dependencies (default: npm).',
			required: false,
		}
	);

	public get packageManager(): PackageManager | undefined {
		const value = this.packageManagerValue;
		if (typeof value !== 'string') {
			return undefined;
		}

		return InitCommandBase.parsePackageManager(value);
	}

	summary: string | null = null;
	manifest: InitWorkflowResult['manifest'] | null = null;
	dependencySource: string | null = null;

	protected async executeInitCommand(
		options: InitCommandExecuteOptions
	): Promise<WPKExitCode> {
		try {
			const { workflow } = await runInitCommand({
				...options,
				command: this,
				allowDirty: this.allowDirty === true,
				packageManager: this.packageManager,
			});

			this.summary = workflow.summaryText;
			this.manifest = workflow.manifest;
			this.dependencySource = workflow.dependencySource;

			this.context.stdout.write(workflow.summaryText);
			return WPK_EXIT_CODES.SUCCESS;
		} catch (error) {
			this.summary = null;
			this.manifest = null;
			this.dependencySource = null;

			if (WPKernelError.isWPKernelError(error)) {
				this.context.stderr.write(
					formatInitWorkflowError(options.commandName, error)
				);
				return WPK_EXIT_CODES.VALIDATION_ERROR;
			}

			throw error;
		}
	}
}

export interface InitCommandContext {
	readonly workspaceRoot: string;
	readonly cwd: string;
}

export type InitCommandHooks = Partial<{
	resolveWorkspaceRoot: (cwd: string, command: InitCommandState) => string;
	buildReadinessOptions: (
		command: InitCommandState
	) => InitCommandRuntimeOptions['readiness'];
	filterReadinessKeys: (
		keys: readonly ReadinessKey[],
		helpers: readonly ReadinessHelperDescriptor[],
		command: InitCommandState
	) => ReadonlyArray<ReadinessKey>;
	prepare: (
		runtime: InitCommandRuntimeResult,
		context: InitCommandContext,
		command: InitCommandState
	) => Promise<void>;
	afterWorkflow: (
		result: InitWorkflowResult,
		runtime: InitCommandRuntimeResult,
		context: InitCommandContext,
		command: InitCommandState
	) => Promise<void>;
	afterReadiness: (
		runtime: InitCommandRuntimeResult,
		context: InitCommandContext,
		command: InitCommandState
	) => Promise<void>;
}>;

export interface RunInitCommandOptions {
	readonly command: InitCommandBase;
	readonly reporterNamespace: string;
	readonly dependencies: InitCommandRuntimeDependencies;
	readonly hooks?: InitCommandHooks;
	readonly allowDirty?: boolean;
	readonly installDependencies?: boolean;
	readonly installers?: Partial<InitWorkflowInstallers>;
	readonly packageManager?: PackageManager;
}

export interface RunInitCommandResult {
	readonly runtime: InitCommandRuntimeResult;
	readonly workflow: InitWorkflowResult;
	readonly context: InitCommandContext;
}

export type InitCommandExecuteOptions = Omit<
	RunInitCommandOptions,
	'command'
> & {
	readonly commandName: 'create' | 'init';
};

export async function runInitCommand({
	command,
	reporterNamespace,
	dependencies,
	allowDirty = false,
	hooks = {},
	installDependencies,
	installers,
	packageManager,
}: RunInitCommandOptions): Promise<RunInitCommandResult> {
	const cwd = resolveCommandCwd(command.context);
	const workspaceRoot = resolveWorkspaceRootForCommand(cwd, command, hooks);
	const readiness = buildReadinessOptionsForCommand(command, hooks);

	const runtime = createInitCommandRuntime(dependencies, {
		reporterNamespace,
		workspaceRoot,
		cwd,
		projectName: command.name,
		template: command.template,
		force: command.force,
		verbose: command.verbose,
		preferRegistryVersions: command.preferRegistryVersions,
		readiness,
		allowDirty,
		installDependencies,
		installers,
		packageManager,
	});

	const context: InitCommandContext = { workspaceRoot, cwd };

	await hooks.prepare?.(runtime, context, command);

	const workflow = await runtime.runWorkflow();

	await hooks.afterWorkflow?.(workflow, runtime, context, command);

	await runReadinessPhase(runtime, hooks, command);

	await hooks.afterReadiness?.(runtime, context, command);

	return { runtime, workflow, context };
}

function resolveWorkspaceRootForCommand(
	cwd: string,
	command: InitCommandState,
	hooks: InitCommandHooks
): string {
	return hooks.resolveWorkspaceRoot?.(cwd, command) ?? cwd;
}

function buildReadinessOptionsForCommand(
	command: InitCommandState,
	hooks: InitCommandHooks
): InitCommandRuntimeOptions['readiness'] | undefined {
	return hooks.buildReadinessOptions?.(command);
}

async function runReadinessPhase(
	runtime: InitCommandRuntimeResult,
	hooks: InitCommandHooks,
	command: InitCommandState
): Promise<void> {
	const keys =
		hooks.filterReadinessKeys?.(
			runtime.readiness.defaultKeys,
			runtime.readiness.helpers,
			command
		) ?? runtime.readiness.defaultKeys;

	if (keys.length === 0) {
		return;
	}

	const result = await runtime.readiness.run(keys);
	assertReadinessRun(result);
}
