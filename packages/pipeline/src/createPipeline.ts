import { isPromiseLike, maybeThen } from './async-utils.js';
import { type RegisteredHelper } from './dependency-graph.js';
import { type ExtensionHookEntry } from './extensions.js';
import {
	registerHelper,
	handleExtensionRegisterResult as handleExtensionRegisterResultUtil,
} from './registration.js';
import type { ErrorFactory } from './error-factory.js';
import type {
	CreatePipelineOptions,
	Helper,
	HelperDescriptor,
	HelperKind,
	MaybePromise,
	Pipeline,
	PipelineDiagnostic,
	PipelineReporter,
	PipelineExtension,
	PipelineRunState,
	PipelineStep,
} from './types';
import { initDiagnosticManager } from './internal/diagnostic-manager.js';
import { initPipelineRunner } from './internal/pipeline-runner.js';

/**
 * Creates a pipeline orchestrator-the execution engine that powers WPKernel's code generation stack.
 *
 * The pipeline coordinates helper registration, dependency resolution, execution, diagnostics, and
 * extension hooks. Refer to the package README for a full walkthrough and advanced usage examples.
 *
 * @example
 * ```ts
 * const pipeline = createPipeline({
 *   fragmentKind: 'fragment',
 *   builderKind: 'builder',
 *   createContext: () => ({ reporter }),
 *   createFragmentState: () => ({}),
 *   finalizeFragmentState: ({ draft }) => draft,
 *   createRunResult: ({ artifact, diagnostics }) => ({ artifact, diagnostics }),
 *   createBuildOptions: () => ({}),
 *   createFragmentArgs: ({ helper, draft, context }) => ({
 *     helper,
 *     context,
 *     options: {},
 *     buildOptions: {},
 *     draft,
 *   }),
 *   createBuilderArgs: ({ helper, artifact, context }) => ({
 *     helper,
 *     context,
 *     options: {},
 *     buildOptions: {},
 *     artifact,
 *   }),
 * });
 *
 * pipeline.ir.use(createHelper({...}));
 * pipeline.extensions.use(createPipelineExtension({ key: 'acme.audit' }));
 * const result = await pipeline.run({});
 * console.log(result.diagnostics.length);
 * ```
 *
 * @category Pipeline
 */

export function createPipeline<
	TRunOptions,
	TBuildOptions,
	TContext extends { reporter: TReporter },
	TReporter extends PipelineReporter = PipelineReporter,
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
>(
	options: CreatePipelineOptions<
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
	>
): Pipeline<
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
> {
	const fragmentKind = options.fragmentKind ?? ('fragment' as TFragmentKind);
	const builderKind = options.builderKind ?? ('builder' as TBuilderKind);

	// Create error factory (use provided or default to generic Error)
	const createError: ErrorFactory =
		options.createError ??
		((code, message) => new Error(`[${code}] ${message}`));

	const fragmentEntries: RegisteredHelper<TFragmentHelper>[] = [];
	const builderEntries: RegisteredHelper<TBuilderHelper>[] = [];
	const extensionHooks: ExtensionHookEntry<
		TContext,
		TRunOptions,
		TArtifact
	>[] = [];
	const pendingExtensionRegistrations: Promise<void>[] = [];

	const diagnosticManager = initDiagnosticManager({
		options,
		fragmentKind,
		builderKind,
	});

	const resolveRunResult =
		options.createRunResult ??
		((state: {
			readonly artifact: TArtifact;
			readonly diagnostics: readonly TDiagnostic[];
			readonly steps: readonly PipelineStep[];
		}) =>
			({
				artifact: state.artifact,
				diagnostics: state.diagnostics,
				steps: state.steps,
			}) as TRunResult);

	const { prepareContext, executeRun } = initPipelineRunner({
		options,
		fragmentEntries,
		builderEntries,
		fragmentKind,
		builderKind,
		diagnosticManager,
		createError,
		resolveRunResult,
		extensionHooks,
	});

	const fragmentKindValue = fragmentKind as HelperKind;
	const builderKindValue = builderKind as HelperKind;

	const registerFragmentHelper = (helper: TFragmentHelper) =>
		registerHelper<
			TContext,
			TFragmentInput,
			TFragmentOutput,
			TReporter,
			TFragmentKind,
			TFragmentHelper
		>(
			helper,
			fragmentKind,
			fragmentEntries,
			fragmentKindValue,
			(h, existing, message) =>
				diagnosticManager.flagConflict(
					h as unknown as HelperDescriptor,
					existing as unknown as HelperDescriptor,
					fragmentKindValue,
					message
				),
			createError
		);

	const registerBuilderHelper = (helper: TBuilderHelper) =>
		registerHelper<
			TContext,
			TBuilderInput,
			TBuilderOutput,
			TReporter,
			TBuilderKind,
			TBuilderHelper
		>(
			helper,
			builderKind,
			builderEntries,
			builderKindValue,
			(h, existing, message) =>
				diagnosticManager.flagConflict(
					h as unknown as HelperDescriptor,
					existing as unknown as HelperDescriptor,
					builderKindValue,
					message
				),
			createError
		);

	const handleExtensionResult = (
		extensionKey: string | undefined,
		result: unknown
	) =>
		handleExtensionRegisterResultUtil(extensionKey, result, extensionHooks);

	const trackPendingExtensionRegistration = <T>(
		maybePending: MaybePromise<T>
	): MaybePromise<T> => {
		if (maybePending && isPromiseLike(maybePending)) {
			void Promise.resolve(maybePending).catch(() => {});
			const pending = Promise.resolve(maybePending).then(() => undefined);
			void pending.catch(() => {});
			pendingExtensionRegistrations.push(pending);
			pending
				.finally(() => {
					const index =
						pendingExtensionRegistrations.indexOf(pending);
					if (index !== -1) {
						pendingExtensionRegistrations.splice(index, 1);
					}
				})
				.catch(() => {});
		}

		return maybePending;
	};

	const waitForPendingExtensionRegistrations = (): MaybePromise<void> => {
		if (pendingExtensionRegistrations.length === 0) {
			return;
		}

		return Promise.all([...pendingExtensionRegistrations]).then(
			() => undefined
		);
	};

	type PipelineInstance = Pipeline<
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
	>;

	const pipeline: PipelineInstance = {
		fragmentKind,
		builderKind,
		ir: {
			use(helper: TFragmentHelper) {
				registerFragmentHelper(helper);
			},
		},
		builders: {
			use(helper: TBuilderHelper) {
				registerBuilderHelper(helper);
			},
		},
		extensions: {
			use(
				extension: PipelineExtension<
					PipelineInstance,
					TContext,
					TRunOptions,
					TArtifact
				>
			) {
				const registrationResult = extension.register(pipeline);
				if (registrationResult && isPromiseLike(registrationResult)) {
					void Promise.resolve(registrationResult).catch(() => {});
				}
				const handled = maybeThen(registrationResult, (resolved) =>
					handleExtensionResult(extension.key, resolved)
				);

				return trackPendingExtensionRegistration(handled);
			},
		},
		use(helper: TFragmentHelper | TBuilderHelper) {
			if (helper.kind === fragmentKind) {
				registerFragmentHelper(helper as TFragmentHelper);
				return;
			}

			if (helper.kind === builderKind) {
				registerBuilderHelper(helper as TBuilderHelper);
				return;
			}

			throw createError(
				'ValidationError',
				`Unsupported helper kind "${helper.kind}".`
			);
		},
		run(runOptions: TRunOptions) {
			const startRun = () => {
				const runContext = prepareContext(runOptions);
				return executeRun(runContext);
			};

			return maybeThen(waitForPendingExtensionRegistrations(), () =>
				startRun()
			);
		},
	};

	return pipeline;
}
