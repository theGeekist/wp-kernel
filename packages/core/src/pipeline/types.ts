import type { Reporter } from '../reporter/types';

export type HelperKind = 'fragment' | 'builder' | (string & {});
export type HelperMode = 'extend' | 'override' | 'merge';

export interface HelperDescriptor<TKind extends HelperKind = HelperKind> {
	readonly key: string;
	readonly kind: TKind;
	readonly mode: HelperMode;
	readonly priority: number;
	readonly dependsOn: readonly string[];
	readonly origin?: string;
}

export interface HelperApplyOptions<
	TContext,
	TInput,
	TOutput,
	TReporter extends Reporter = Reporter,
> {
	readonly context: TContext;
	readonly input: TInput;
	readonly output: TOutput;
	readonly reporter: TReporter;
}

export type HelperApplyFn<
	TContext,
	TInput,
	TOutput,
	TReporter extends Reporter = Reporter,
> = (
	options: HelperApplyOptions<TContext, TInput, TOutput, TReporter>,
	next?: () => Promise<void>
) => Promise<void> | void;

export interface Helper<
	TContext,
	TInput,
	TOutput,
	TReporter extends Reporter = Reporter,
	TKind extends HelperKind = HelperKind,
> extends HelperDescriptor<TKind> {
	readonly apply: HelperApplyFn<TContext, TInput, TOutput, TReporter>;
}

export interface CreateHelperOptions<
	TContext,
	TInput,
	TOutput,
	TReporter extends Reporter = Reporter,
	TKind extends HelperKind = HelperKind,
> {
	readonly key: string;
	readonly kind: TKind;
	readonly mode?: HelperMode;
	readonly priority?: number;
	readonly dependsOn?: readonly string[];
	readonly origin?: string;
	readonly apply: HelperApplyFn<TContext, TInput, TOutput, TReporter>;
}

export interface PipelineStep<TKind extends HelperKind = HelperKind>
	extends HelperDescriptor<TKind> {
	readonly id: string;
	readonly index: number;
}

export interface ConflictDiagnostic<TKind extends HelperKind = HelperKind> {
	readonly type: 'conflict';
	readonly key: string;
	readonly mode: HelperMode;
	readonly helpers: readonly string[];
	readonly message: string;
	readonly kind?: TKind;
}

export interface MissingDependencyDiagnostic<
	TKind extends HelperKind = HelperKind,
> {
	readonly type: 'missing-dependency';
	readonly key: string;
	readonly dependency: string;
	readonly message: string;
	readonly kind?: TKind;
	readonly helper?: string;
}

export interface UnusedHelperDiagnostic<TKind extends HelperKind = HelperKind> {
	readonly type: 'unused-helper';
	readonly key: string;
	readonly message: string;
	readonly kind?: TKind;
	readonly helper?: string;
	readonly dependsOn?: readonly string[];
}

export type PipelineDiagnostic<TKind extends HelperKind = HelperKind> =
	| ConflictDiagnostic<TKind>
	| MissingDependencyDiagnostic<TKind>
	| UnusedHelperDiagnostic<TKind>;

export interface PipelineRunState<
	TArtifact,
	TDiagnostic extends PipelineDiagnostic = PipelineDiagnostic,
> {
	readonly artifact: TArtifact;
	readonly diagnostics: readonly TDiagnostic[];
	readonly steps: readonly PipelineStep[];
}

export interface PipelineExtensionHookOptions<TContext, TOptions, TArtifact> {
	readonly context: TContext;
	readonly options: TOptions;
	readonly artifact: TArtifact;
}

export interface PipelineExtensionHookResult<TArtifact> {
	readonly artifact?: TArtifact;
	readonly commit?: () => Promise<void>;
	readonly rollback?: () => Promise<void>;
}

export type PipelineExtensionHook<TContext, TOptions, TArtifact> = (
	options: PipelineExtensionHookOptions<TContext, TOptions, TArtifact>
) => Promise<PipelineExtensionHookResult<TArtifact> | void>;

export interface PipelineExtension<TPipeline, TContext, TOptions, TArtifact> {
	readonly key?: string;
	register: (
		pipeline: TPipeline
	) =>
		| void
		| PipelineExtensionHook<TContext, TOptions, TArtifact>
		| Promise<void | PipelineExtensionHook<TContext, TOptions, TArtifact>>;
}

export interface CreatePipelineOptions<
	TRunOptions,
	TBuildOptions,
	TContext extends { reporter: TReporter },
	TReporter extends Reporter = Reporter,
	TDraft = unknown,
	TArtifact = unknown,
	TDiagnostic extends PipelineDiagnostic = PipelineDiagnostic,
	TRunResult = PipelineRunState<TArtifact, TDiagnostic>,
	TFragmentInput = unknown,
	TFragmentOutput = unknown,
	TBuilderInput = unknown,
	TBuilderOutput = unknown,
	TFragmentKind extends HelperKind = 'fragment',
	TBuilderKind extends HelperKind = 'builder',
	TFragmentHelper extends Helper<
		TContext,
		TFragmentInput,
		TFragmentOutput,
		TReporter,
		TFragmentKind
	> = Helper<
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
	> = Helper<
		TContext,
		TBuilderInput,
		TBuilderOutput,
		TReporter,
		TBuilderKind
	>,
> {
	readonly fragmentKind?: TFragmentKind;
	readonly builderKind?: TBuilderKind;
	readonly createBuildOptions: (options: TRunOptions) => TBuildOptions;
	readonly createContext: (options: TRunOptions) => TContext;
	readonly createFragmentState: (options: {
		readonly options: TRunOptions;
		readonly context: TContext;
		readonly buildOptions: TBuildOptions;
	}) => TDraft;
	readonly createFragmentArgs: (options: {
		readonly helper: TFragmentHelper;
		readonly options: TRunOptions;
		readonly context: TContext;
		readonly buildOptions: TBuildOptions;
		readonly draft: TDraft;
	}) => HelperApplyOptions<
		TContext,
		TFragmentInput,
		TFragmentOutput,
		TReporter
	>;
	readonly finalizeFragmentState: (options: {
		readonly draft: TDraft;
		readonly options: TRunOptions;
		readonly context: TContext;
		readonly buildOptions: TBuildOptions;
	}) => TArtifact;
	readonly createBuilderArgs: (options: {
		readonly helper: TBuilderHelper;
		readonly options: TRunOptions;
		readonly context: TContext;
		readonly buildOptions: TBuildOptions;
		readonly artifact: TArtifact;
	}) => HelperApplyOptions<
		TContext,
		TBuilderInput,
		TBuilderOutput,
		TReporter
	>;
	readonly createRunResult?: (options: {
		readonly artifact: TArtifact;
		readonly diagnostics: readonly TDiagnostic[];
		readonly steps: readonly PipelineStep[];
		readonly context: TContext;
		readonly buildOptions: TBuildOptions;
		readonly options: TRunOptions;
	}) => TRunResult;
	readonly createExtensionHookOptions?: (options: {
		readonly context: TContext;
		readonly options: TRunOptions;
		readonly buildOptions: TBuildOptions;
		readonly artifact: TArtifact;
	}) => PipelineExtensionHookOptions<TContext, TBuildOptions, TArtifact>;
	readonly onExtensionRollbackError?: (options: {
		readonly error: unknown;
		readonly extensionKeys: readonly string[];
		readonly context: TContext;
	}) => void;
	readonly createConflictDiagnostic?: (options: {
		readonly helper: TFragmentHelper | TBuilderHelper;
		readonly existing: TFragmentHelper | TBuilderHelper;
		readonly message: string;
	}) => TDiagnostic;
	readonly createMissingDependencyDiagnostic?: (options: {
		readonly helper: TFragmentHelper | TBuilderHelper;
		readonly dependency: string;
		readonly message: string;
	}) => TDiagnostic;
	readonly createUnusedHelperDiagnostic?: (options: {
		readonly helper: TFragmentHelper | TBuilderHelper;
		readonly message: string;
	}) => TDiagnostic;
}

export interface Pipeline<
	TRunOptions,
	TRunResult,
	TContext extends { reporter: TReporter },
	TReporter extends Reporter = Reporter,
	TBuildOptions = unknown,
	TArtifact = unknown,
	TFragmentInput = unknown,
	TFragmentOutput = unknown,
	TBuilderInput = unknown,
	TBuilderOutput = unknown,
	TDiagnostic extends PipelineDiagnostic = PipelineDiagnostic,
	TFragmentKind extends HelperKind = 'fragment',
	TBuilderKind extends HelperKind = 'builder',
	TFragmentHelper extends Helper<
		TContext,
		TFragmentInput,
		TFragmentOutput,
		TReporter,
		TFragmentKind
	> = Helper<
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
	> = Helper<
		TContext,
		TBuilderInput,
		TBuilderOutput,
		TReporter,
		TBuilderKind
	>,
> {
	readonly fragmentKind: TFragmentKind;
	readonly builderKind: TBuilderKind;
	readonly ir: {
		use: (helper: TFragmentHelper) => void;
	};
	readonly builders: {
		use: (helper: TBuilderHelper) => void;
	};
	readonly extensions: {
		use: (
			extension: PipelineExtension<
				Pipeline<
					TRunOptions,
					TRunResult,
					TContext,
					TReporter,
					TBuildOptions,
					TArtifact,
					TFragmentInput,
					TFragmentOutput,
					TBuilderInput,
					TBuilderOutput,
					TDiagnostic,
					TFragmentKind,
					TBuilderKind,
					TFragmentHelper,
					TBuilderHelper
				>,
				TContext,
				TBuildOptions,
				TArtifact
			>
		) => unknown | Promise<unknown>;
	};
	use: (helper: TFragmentHelper | TBuilderHelper) => void;
	run: (options: TRunOptions) => Promise<TRunResult>;
}
