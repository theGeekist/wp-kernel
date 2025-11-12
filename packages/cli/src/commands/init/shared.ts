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
import type { InitWorkflowResult } from './workflow';

export interface InitCommandState {
	name?: string;
	template?: string;
	force: boolean;
	verbose: boolean;
	preferRegistryVersions: boolean;
	yes: boolean;
	allowDirty: boolean;
	summary: string | null;
	manifest: InitWorkflowResult['manifest'] | null;
	dependencySource: string | null;
}

export abstract class InitCommandBase
	extends Command
	implements InitCommandState
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
	allowDirty = Option.Boolean('--allow-dirty', false);

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
