import type {
	CreateDependencyGraphOptions,
	RegisteredHelper,
} from '../dependency-graph';
import type { ErrorFactory } from '../error-factory';
import type {
	CreatePipelineOptions,
	Helper,
	HelperApplyOptions,
	HelperKind,
	MaybePromise,
	PipelineDiagnostic,
	PipelineExecutionMetadata,
	PipelineExtensionHookOptions,
	PipelineExtensionLifecycle,
	PipelineExtensionRollbackErrorMetadata,
	PipelineReporter,
	PipelineStep,
} from '../types';
import type { DiagnosticManager } from './diagnostic-manager.types';
import type { ExtensionHookEntry } from '../extensions';

/**
 * Mutable state captured while preparing a pipeline run. This mirrors the context consumed by
 * {@link executeHelpers} and downstream extension orchestration.
 *
 * @category Pipeline
 * @internal
 */
export interface PipelineRunContext<
	TRunOptions,
	TBuildOptions,
	TContext,
	TDraft,
	TArtifact,
	TFragmentHelper,
	TBuilderHelper,
> {
	readonly runOptions: TRunOptions;
	readonly buildOptions: TBuildOptions;
	readonly context: TContext;
	readonly draft: TDraft;
	readonly fragmentOrder: RegisteredHelper<TFragmentHelper>[];
	readonly steps: PipelineStep[];
	readonly pushStep: (entry: RegisteredHelper<unknown>) => void;
	readonly builderGraphOptions: CreateDependencyGraphOptions<TBuilderHelper>;
	readonly buildHookOptions: (
		artifact: TArtifact,
		lifecycle: PipelineExtensionLifecycle
	) => PipelineExtensionHookOptions<TContext, TRunOptions, TArtifact>;
	readonly handleRollbackError: (options: {
		readonly error: unknown;
		readonly extensionKeys: readonly string[];
		readonly hookSequence: readonly string[];
		readonly errorMetadata: PipelineExtensionRollbackErrorMetadata;
		readonly context: TContext;
	}) => void;
}

/**
 * Dependency bundle consumed by {@link initPipelineRunner}. Splitting the type into a dedicated
 * module improves cognitive load in the implementation file and keeps the generics re-usable for
 * test doubles.
 *
 * @category Pipeline
 * @internal
 */
export interface PipelineRunnerDependencies<
	TRunOptions,
	TBuildOptions,
	TContext extends { reporter: TReporter },
	TReporter extends PipelineReporter,
	TDraft,
	TArtifact,
	TDiagnostic extends PipelineDiagnostic,
	TRunResult,
	TFragmentInput,
	TFragmentOutput,
	TBuilderInput,
	TBuilderOutput,
	TFragmentKind extends HelperKind,
	TBuilderKind extends HelperKind,
	TFragmentHelper extends Helper<
		TContext,
		TFragmentInput,
		TFragmentOutput,
		TReporter,
		TFragmentKind
	>,
	TBuilderHelper extends Helper<
		TContext,
		TBuilderInput,
		TBuilderOutput,
		TReporter,
		TBuilderKind
	>,
> {
	readonly options: CreatePipelineOptions<
		TRunOptions,
		TBuildOptions,
		TContext,
		TReporter,
		TDraft,
		TArtifact,
		TDiagnostic,
		TRunResult,
		TFragmentInput,
		TFragmentOutput,
		TBuilderInput,
		TBuilderOutput,
		TFragmentKind,
		TBuilderKind,
		TFragmentHelper,
		TBuilderHelper
	>;
	readonly fragmentEntries: RegisteredHelper<TFragmentHelper>[];
	readonly builderEntries: RegisteredHelper<TBuilderHelper>[];
	readonly fragmentKind: TFragmentKind;
	readonly builderKind: TBuilderKind;
	readonly diagnosticManager: DiagnosticManager<
		TRunOptions,
		TBuildOptions,
		TContext,
		TReporter,
		TDraft,
		TArtifact,
		TDiagnostic,
		TRunResult,
		TFragmentInput,
		TFragmentOutput,
		TBuilderInput,
		TBuilderOutput,
		TFragmentKind,
		TBuilderKind,
		TFragmentHelper,
		TBuilderHelper
	>;
	readonly createError: ErrorFactory;
	readonly resolveRunResult: (state: {
		readonly artifact: TArtifact;
		readonly diagnostics: readonly TDiagnostic[];
		readonly steps: readonly PipelineStep[];
		readonly context: TContext;
		readonly buildOptions: TBuildOptions;
		readonly options: TRunOptions;
		readonly helpers: PipelineExecutionMetadata<
			TFragmentKind,
			TBuilderKind
		>;
	}) => TRunResult;
	readonly extensionHooks: ExtensionHookEntry<
		TContext,
		TRunOptions,
		TArtifact
	>[];
}

/**
 * Public surface returned by {@link initPipelineRunner}. Downstream consumers receive a helper to
 * prepare the context (building dependency graphs, instantiating drafts) and an executor that runs
 * the prepared context through fragments, extensions, and builders.
 *
 * @category Pipeline
 * @internal
 */
export interface PipelineRunner<
	TRunOptions,
	TBuildOptions,
	TContext extends { reporter: TReporter },
	TReporter extends PipelineReporter,
	TDraft,
	TArtifact,
	TDiagnostic extends PipelineDiagnostic,
	TRunResult,
	TFragmentInput,
	TFragmentOutput,
	TBuilderInput,
	TBuilderOutput,
	TFragmentKind extends HelperKind,
	TBuilderKind extends HelperKind,
	TFragmentHelper extends Helper<
		TContext,
		TFragmentInput,
		TFragmentOutput,
		TReporter,
		TFragmentKind
	>,
	TBuilderHelper extends Helper<
		TContext,
		TBuilderInput,
		TBuilderOutput,
		TReporter,
		TBuilderKind
	>,
> {
	readonly prepareContext: (
		runOptions: TRunOptions
	) => PipelineRunContext<
		TRunOptions,
		TBuildOptions,
		TContext,
		TDraft,
		TArtifact,
		TFragmentHelper,
		TBuilderHelper
	>;
	readonly executeRun: (
		context: PipelineRunContext<
			TRunOptions,
			TBuildOptions,
			TContext,
			TDraft,
			TArtifact,
			TFragmentHelper,
			TBuilderHelper
		>
	) => MaybePromise<TRunResult>;
	readonly __types?: {
		diagnostic: TDiagnostic;
		helperArgs: HelperApplyOptions<unknown, unknown, unknown>;
	};
}

export type { ExtensionHookEntry };
