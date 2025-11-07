import type {
	ActionConfig,
	ActionContext,
	ResolvedActionOptions,
} from '../../actions/types';
import type { ActionDefinedEvent } from '../../events/bus';
import type { WPKernelError } from '../../error/WPKernelError';
import type { Reporter } from '../../reporter/types';
import type {
	CreatePipelineOptions,
	Helper,
	Pipeline,
	PipelineDiagnostic,
	PipelineRunState,
} from '@wpkernel/pipeline';
import type { CorePipelineContext } from '../helpers/context';

/**
 * Helper kind identifier reserved for action lifecycle fragments.
 *
 * @example
 * ```ts
 * pipeline.ir.use({
 *   key: 'custom.fragment',
 *   kind: ACTION_FRAGMENT_KIND,
 *   apply: ({ output }) => {
 *     output.startTime = Date.now();
 *   },
 * });
 * ```
 */
export const ACTION_FRAGMENT_KIND = 'core.action.fragment' as const;
export type ActionFragmentKind = typeof ACTION_FRAGMENT_KIND;

export const ACTION_BUILDER_KIND = 'core.action.builder' as const;
export type ActionBuilderKind = typeof ACTION_BUILDER_KIND;

/**
 * Runtime options passed to the pipeline when executing an action.
 *
 * @example
 * ```ts
 * const runOptions: ActionPipelineRunOptions<{ postId: number }, string> = {
 *   config: {
 *     name: 'posts.update',
 *     handler: async (_ctx, args) => `updated:${args.postId}`,
 *   },
 *   args: { postId: 42 },
 *   definition: {
 *     action: createAction, // Defined action reference
 *     namespace: 'example/posts',
 *   },
 * };
 * ```
 */
export interface ActionPipelineRunOptions<TArgs, TResult> {
	/** Resolved action definition, including handler metadata. */
	readonly config: ActionConfig<TArgs, TResult>;
	/** Arguments provided by the caller of the defined action. */
	readonly args: TArgs;
	/** Definition metadata for registry bookkeeping. */
	readonly definition: ActionDefinedEvent;
	/** Optional registry bridge surfaced to helpers. */
	readonly registry?: CorePipelineContext['registry'];
}

/**
 * Build-time options derived from the run options before helper invocation.
 *
 * @example
 * ```ts
 * const buildOptions: ActionPipelineBuildOptions<{ postId: number }, string> = {
 *   config: runOptions.config,
 * };
 * ```
 */
export interface ActionPipelineBuildOptions<TArgs, TResult> {
	/** Original action configuration object. */
	readonly config: ActionConfig<TArgs, TResult>;
}

/**
 * Shared context handed to every helper participating in the pipeline.
 *
 * @example
 * ```ts
 * const context: ActionPipelineContext = {
 *   reporter,
 *   actionName: 'posts.update',
 *   namespace: 'example/posts',
 *   resolvedOptions: { scope: 'crossTab', bridged: true },
 *   requestId: 'action-1a2b3c',
 *   actionContext,
 *   config: runOptions.config,
 *   args: runOptions.args,
 *   definition: runOptions.definition,
 * };
 * ```
 */
export interface ActionPipelineContext<TArgs = unknown, TResult = unknown>
	extends CorePipelineContext {
	/** Structured reporter used for diagnostics and lifecycle events. */
	reporter: Reporter;
	/** Canonical action name registered via `defineAction`. */
	readonly actionName: string;
	/** Namespace owning the action (usually plugin slug). */
	namespace: string;
	/** Final runtime options controlling bridging and scope. */
	resolvedOptions?: ResolvedActionOptions;
	/** Correlation identifier for the current invocation. */
	readonly requestId: string;
	/** Rich action context injected into user handlers. */
	actionContext?: ActionContext;
	/** Original action configuration. */
	readonly config: ActionConfig<TArgs, TResult>;
	/** Call-time arguments. */
	readonly args: TArgs;
	/** Action definition metadata for registry bookkeeping. */
	readonly definition: ActionDefinedEvent;
}

/**
 * Input payload received by lifecycle fragments prior to handler execution.
 *
 * @example
 * ```ts
 * const fragmentInput: ActionLifecycleFragmentInput<{ postId: number }> = {
 *   args: { postId: 42 },
 * };
 * ```
 */
export interface ActionLifecycleFragmentInput<TArgs> {
	/** User supplied arguments forwarded to lifecycle fragments. */
	readonly args: TArgs;
}

/**
 * Input payload received by builder helpers responsible for invoking handlers.
 *
 * @example
 * ```ts
 * const builderInput: ActionBuilderInput<{ postId: number }, string> = {
 *   args: { postId: 42 },
 *   handler: runOptions.config.handler,
 * };
 * ```
 */
export interface ActionBuilderInput<TArgs, TResult> {
	/** Latest arguments forwarded to the action handler. */
	readonly args: TArgs;
	/** Bound action handler extracted from the configuration. */
	readonly handler: ActionConfig<TArgs, TResult>['handler'];
}

/**
 * Mutable draft object populated throughout pipeline execution.
 *
 * @example
 * ```ts
 * const draft: ActionInvocationDraft<string> = {
 *   startTime: performance.now(),
 *   result: 'ok',
 * };
 * ```
 */
export interface ActionInvocationDraft<TResult> {
	/** Monotonic timestamp captured when execution begins. */
	startTime?: number;
	/** Total runtime duration in milliseconds. */
	durationMs?: number;
	/** Successful handler result, when available. */
	result?: TResult;
	/** Normalized WPKernel error when execution fails. */
	error?: WPKernelError;
	/** Final resolved options shared with metadata helpers. */
	resolvedOptions?: ResolvedActionOptions;
}

/**
 * Alias representing the final artifact produced by the pipeline run.
 *
 * @example
 * ```ts
 * const artifact: ActionPipelineArtifact<string> = {
 *   durationMs: 120,
 *   result: 'ok',
 * };
 * ```
 */
export type ActionPipelineArtifact<TResult> = ActionInvocationDraft<TResult>;

/**
 * Structured run result returned to the caller after pipeline completion.
 *
 * @example
 * ```ts
 * const runResult: ActionPipelineRunResult<string> = {
 *   artifact: { result: 'ok', durationMs: 12 },
 *   diagnostics: [],
 *   steps: [],
 * };
 * ```
 */
export type ActionPipelineRunResult<TResult> = PipelineRunState<
	ActionPipelineArtifact<TResult>,
	PipelineDiagnostic
>;

/**
 * Pipeline configuration contract used to instantiate the action pipeline.
 */
export type ActionPipelineOptions<TArgs, TResult> = CreatePipelineOptions<
	ActionPipelineRunOptions<TArgs, TResult>,
	ActionPipelineBuildOptions<TArgs, TResult>,
	ActionPipelineContext<TArgs, TResult>,
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

/**
 * Fully constructed action pipeline exposing helper registration and execution.
 */
export type ActionPipeline<TArgs, TResult> = Pipeline<
	ActionPipelineRunOptions<TArgs, TResult>,
	ActionPipelineRunResult<TResult>,
	ActionPipelineContext<TArgs, TResult>,
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
 *
 * @example
 * ```ts
 * const fragment: ActionFragmentHelper<{ postId: number }, string> = createHelper({
 *   key: 'action.track.args',
 *   kind: ACTION_FRAGMENT_KIND,
 *   apply: ({ input, output }) => {
 *     output.argsSnapshot = input.args;
 *   },
 * });
 * ```
 */
export type ActionFragmentHelper<TArgs, TResult> = Helper<
	ActionPipelineContext<TArgs, TResult>,
	ActionLifecycleFragmentInput<TArgs>,
	ActionInvocationDraft<TResult>,
	Reporter,
	ActionFragmentKind
>;

/**
 * Descriptor type for builder helpers that execute the action handler.
 *
 * @example
 * ```ts
 * const builder: ActionBuilderHelper<{ postId: number }, string> = createHelper({
 *   key: 'action.append.metadata',
 *   kind: ACTION_BUILDER_KIND,
 *   apply: async ({ output }, next) => {
 *     await next?.();
 *     output.metadata = { tracked: true };
 *   },
 * });
 * ```
 */
export type ActionBuilderHelper<TArgs, TResult> = Helper<
	ActionPipelineContext<TArgs, TResult>,
	ActionBuilderInput<TArgs, TResult>,
	ActionInvocationDraft<TResult>,
	Reporter,
	ActionBuilderKind
>;
