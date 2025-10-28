import type {
	ActionConfig,
	ActionContext,
	ResolvedActionOptions,
} from '../../actions/types';
import type { WPKernelError } from '../../error/WPKernelError';
import type { Reporter } from '../../reporter/types';
import type {
	CreatePipelineOptions,
	Helper,
	Pipeline,
	PipelineDiagnostic,
	PipelineRunState,
} from '../types';

/**
 * Helper kind identifiers reserved for action pipeline helpers.
 */
export const ACTION_FRAGMENT_KIND = 'core.action.fragment' as const;
export type ActionFragmentKind = typeof ACTION_FRAGMENT_KIND;

export const ACTION_BUILDER_KIND = 'core.action.builder' as const;
export type ActionBuilderKind = typeof ACTION_BUILDER_KIND;

/**
 * Runtime options passed to the pipeline when executing an action.
 */
export interface ActionPipelineRunOptions<TArgs, TResult> {
	readonly config: ActionConfig<TArgs, TResult>;
	readonly args: TArgs;
	readonly resolvedOptions: ResolvedActionOptions;
}

/**
 * Build-time options derived from the run options before helper invocation.
 */
export interface ActionPipelineBuildOptions<TArgs, TResult> {
	readonly config: ActionConfig<TArgs, TResult>;
	readonly resolvedOptions: ResolvedActionOptions;
}

/**
 * Shared context handed to every helper participating in the pipeline.
 */
export interface ActionPipelineContext {
	readonly reporter: Reporter;
	readonly actionName: string;
	readonly namespace: string;
	readonly resolvedOptions: ResolvedActionOptions;
	readonly requestId: string;
	readonly actionContext: ActionContext;
}

/**
 * Input payload received by lifecycle fragments prior to handler execution.
 */
export interface ActionLifecycleFragmentInput<TArgs> {
	readonly args: TArgs;
}

/**
 * Input payload received by builder helpers responsible for invoking handlers.
 */
export interface ActionBuilderInput<TArgs, TResult> {
	readonly args: TArgs;
	readonly handler: ActionConfig<TArgs, TResult>['handler'];
}

/**
 * Mutable draft object populated throughout pipeline execution.
 */
export interface ActionInvocationDraft<TResult> {
	startTime?: number;
	durationMs?: number;
	result?: TResult;
	error?: WPKernelError;
}

/**
 * Alias representing the final artifact produced by the pipeline run.
 */
export type ActionPipelineArtifact<TResult> = ActionInvocationDraft<TResult>;

/**
 * Structured run result returned to the caller after pipeline completion.
 */
export type ActionPipelineRunResult<TResult> = PipelineRunState<
	ActionPipelineArtifact<TResult>,
	PipelineDiagnostic
>;

export type ActionPipelineOptions<TArgs, TResult> = CreatePipelineOptions<
	ActionPipelineRunOptions<TArgs, TResult>,
	ActionPipelineBuildOptions<TArgs, TResult>,
	ActionPipelineContext,
	Reporter,
	ActionInvocationDraft<TResult>,
	ActionPipelineArtifact<TResult>,
	PipelineDiagnostic,
	ActionPipelineRunResult<TResult>,
	ActionLifecycleFragmentInput<TArgs>,
	ActionInvocationDraft<TResult>,
	ActionBuilderInput<TArgs, TResult>,
	ActionInvocationDraft<TResult>,
	ActionFragmentKind,
	ActionBuilderKind,
	ActionFragmentHelper<TArgs, TResult>,
	ActionBuilderHelper<TArgs, TResult>
>;

export type ActionPipeline<TArgs, TResult> = Pipeline<
	ActionPipelineRunOptions<TArgs, TResult>,
	ActionPipelineRunResult<TResult>,
	ActionPipelineContext,
	Reporter,
	ActionPipelineBuildOptions<TArgs, TResult>,
	ActionPipelineArtifact<TResult>,
	ActionLifecycleFragmentInput<TArgs>,
	ActionInvocationDraft<TResult>,
	ActionBuilderInput<TArgs, TResult>,
	ActionInvocationDraft<TResult>,
	PipelineDiagnostic,
	ActionFragmentKind,
	ActionBuilderKind,
	ActionFragmentHelper<TArgs, TResult>,
	ActionBuilderHelper<TArgs, TResult>
>;

/**
 * Descriptor type for lifecycle fragment helpers.
 */
export type ActionFragmentHelper<TArgs, TResult> = Helper<
	ActionPipelineContext,
	ActionLifecycleFragmentInput<TArgs>,
	ActionInvocationDraft<TResult>,
	Reporter,
	ActionFragmentKind
>;

/**
 * Descriptor type for builder helpers that execute the action handler.
 */
export type ActionBuilderHelper<TArgs, TResult> = Helper<
	ActionPipelineContext,
	ActionBuilderInput<TArgs, TResult>,
	ActionInvocationDraft<TResult>,
	Reporter,
	ActionBuilderKind
>;
