import type {
	ActionConfig,
	ActionContext,
	ResolvedActionOptions,
} from '../../actions/types';
import type { WPKernelError } from '../../error/WPKernelError';
import type { Reporter } from '../../reporter/types';
import type { Helper, PipelineDiagnostic, PipelineRunState } from '../types';

export type ActionFragmentKind = 'core.action.fragment';
export type ActionBuilderKind = 'core.action.builder';

export interface ActionPipelineRunOptions<TArgs, TResult> {
	readonly config: ActionConfig<TArgs, TResult>;
	readonly args: TArgs;
	readonly resolvedOptions: ResolvedActionOptions;
}

export interface ActionPipelineBuildOptions<TArgs, TResult> {
	readonly config: ActionConfig<TArgs, TResult>;
	readonly resolvedOptions: ResolvedActionOptions;
}

export interface ActionPipelineContext {
	readonly reporter: Reporter;
	readonly actionName: string;
	readonly namespace: string;
	readonly resolvedOptions: ResolvedActionOptions;
	readonly requestId: string;
	readonly actionContext: ActionContext;
}

export interface ActionLifecycleFragmentInput<TArgs> {
	readonly args: TArgs;
}

export interface ActionBuilderInput<TArgs, TResult> {
	readonly args: TArgs;
	readonly handler: ActionConfig<TArgs, TResult>['handler'];
}

export interface ActionInvocationDraft<TResult> {
	startTime?: number;
	durationMs?: number;
	result?: TResult;
	error?: WPKernelError;
}

export type ActionPipelineArtifact<TResult> = ActionInvocationDraft<TResult>;

export type ActionPipelineRunResult<TResult> = PipelineRunState<
	ActionPipelineArtifact<TResult>,
	PipelineDiagnostic
>;

export type ActionFragmentHelper<TArgs, TResult> = Helper<
	ActionPipelineContext,
	ActionLifecycleFragmentInput<TArgs>,
	ActionInvocationDraft<TResult>,
	Reporter,
	ActionFragmentKind
>;

export type ActionBuilderHelper<TArgs, TResult> = Helper<
	ActionPipelineContext,
	ActionBuilderInput<TArgs, TResult>,
	ActionInvocationDraft<TResult>,
	Reporter,
	ActionBuilderKind
>;
