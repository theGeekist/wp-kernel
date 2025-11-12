import { isPromiseLike, maybeThen, maybeTry } from './async-utils.js';
import {
	type RegisteredHelper,
	type CreateDependencyGraphOptions,
	createDependencyGraph,
} from './dependency-graph.js';
import {
	commitExtensionResults,
	createRollbackErrorMetadata,
	type ExtensionHookEntry,
	rollbackExtensionResults,
	runExtensionHooks,
} from './extensions.js';
import { executeHelpers } from './executor.js';
import {
	registerHelper,
	handleExtensionRegisterResult as handleExtensionRegisterResultUtil,
} from './registration.js';
import type { ErrorFactory } from './error-factory.js';
import type {
	CreatePipelineOptions,
	Helper,
	HelperApplyOptions,
	HelperKind,
	HelperDescriptor,
	MaybePromise,
	Pipeline,
	PipelineDiagnostic,
	PipelineReporter,
	PipelineExtension,
	PipelineExtensionHookOptions,
	PipelineExtensionLifecycle,
	PipelineExtensionRollbackErrorMetadata,
	HelperExecutionSnapshot,
	PipelineExecutionMetadata,
	PipelineRunState,
	PipelineStep,
} from './types';

/**
 * Creates a pipeline orchestrator-the execution engine that powers WPKernel's entire code generation infrastructure.
 *
 * ## Why Pipelines Matter
 *
 * The pipeline system is the **single most critical component** of the framework:
 *
 * - **CLI package**: Every generator (`wpk generate resource`, `wpk generate action`, etc.) runs on pipeline
 * - **PHP Driver**: All PHP AST transformations flow through pipeline helpers
 * - **Core package**: Resource definitions, action middleware, and capability proxies leverage pipeline
 * - **Future-proof**: Designed to extract into standalone `@wpkernel/pipeline` package
 *
 * Pipelines provide:
 * 1. **Dependency resolution**: Topologically sorts helpers based on `dependsOn` declarations
 * 2. **Priority ordering**: Executes helpers in deterministic order via priority values
 * 3. **Error recovery**: Automatic rollback on failure via commit/rollback protocol
 * 4. **Diagnostics**: Built-in error tracking with reporter integration
 * 5. **Extensibility**: Plugin-style extensions via hooks (pre-run, post-build, etc.)
 *
 * ## Architecture
 *
 * A pipeline consists of three phases:
 *
 * ### 1. Registration Phase
 * ```
 * pipeline.registerFragment(helper1)
 * pipeline.registerBuilder(helper2)
 * ```
 * Helpers are collected but not executed. Dependency graph is constructed.
 *
 * ### 2. Execution Phase
 * ```
 * const result = await pipeline.run(options)
 * ```
 * - Validates dependency graph (detects missing deps, cycles)
 * - Sorts helpers topologically
 * - Runs fragment helpers to transform AST
 * - Runs builder helpers to produce artifacts
 * - Commits successful results
 *
 * ### 3. Rollback Phase (on error)
 * ```
 * // Automatic on failure
 * ```
 * - Walks back through executed helpers in reverse order
 * - Invokes rollback functions to undo side effects
 * - Aggregates diagnostics for debugging
 *
 * ## Extension System
 *
 * Pipelines support hooks that intercept execution at key points:
 *
 * - `pre-run`: Before any helpers execute (validation, setup)
 * - `post-fragment`: After fragment helpers complete (AST inspection)
 * - `post-builder`: After builder helpers complete (artifact transformation)
 * - `pre-commit`: Before committing results (final validation)
 *
 * Extensions enable:
 * - Custom validation logic
 * - Third-party integrations (ESLint, Prettier, type checkers)
 * - Conditional execution (feature flags, environment checks)
 * - Artifact post-processing (minification, bundling)
 *
 * ## Type Safety
 *
 * The pipeline is fully generic across 16 type parameters, enabling:
 * - Type-safe context sharing between helpers
 * - Strongly-typed input/output contracts
 * - Custom reporter integration (LogLayer, console, etc.)
 * - Flexible artifact types (strings, AST nodes, binary data)
 *
 * ## Performance
 *
 * - **Lazy execution**: Helpers only run when `pipeline.run()` is called
 * - **Incremental registration**: Add helpers at any time before execution
 * - **Async support**: Mix sync and async helpers seamlessly
 * - **Memory efficiency**: Helpers are immutable descriptors (no closures)
 *
 * @param    options
 * @category Pipeline
 *
 * @example Basic pipeline setup
 * ```typescript
 * import { createPipeline, createHelper } from '@wpkernel/core/pipeline';
 * import { createReporter } from '@wpkernel/core';
 *
 * interface MyContext {
 *   reporter: ReturnType<typeof createReporter>;
 *   namespace: string;
 * }
 *
 * const pipeline = createPipeline({
 *   fragmentKind: 'fragment',
 *   builderKind: 'builder',
 *
 *   createContext: (reporter) => ({
 *     reporter,
 *     namespace: 'MyPlugin',
 *   }),
 *
 *   buildFragment: (ctx, opts) => {
 *     // Transform AST node
 *     const fragment = opts.input;
 *     fragment.namespace = ctx.namespace;
 *     return { fragment };
 *   },
 *
 *   buildArtifact: (ctx, opts) => {
 *     // Generate final PHP code
 *     const code = opts.draft.toString();
 *     return { artifact: code };
 *   },
 * });
 *
 * // Register helpers
 * pipeline.registerFragment(addPHPTagHelper);
 * pipeline.registerFragment(addNamespaceHelper);
 * pipeline.registerBuilder(writeFileHelper);
 *
 * // Execute
 * const result = await pipeline.run({ input: myAST });
 * console.log(result.artifact); // Generated PHP code
 * ```
 *
 * @example Pipeline with extensions
 * ```typescript
 * const pipeline = createPipeline({
 *   // ... base config ...
 *
 *   extensions: [
 *     {
 *       key: 'eslint-validation',
 *       hooks: {
 *         'post-builder': async ({ artifact, context }) => {
 *           const lintResult = await eslint.lintText(artifact);
 *           if (lintResult.errorCount > 0) {
 *             throw new Error('Linting failed');
 *           }
 *           return { artifact };
 *         },
 *       },
 *     },
 *   ],
 * });
 * ```
 *
 * @example Error handling with rollback
 * ```typescript
 * const result = await pipeline.run({ input: myAST });
 *
 * if (!result.success) {
 *   console.error('Pipeline failed:', result.diagnostics);
 *   // Rollback already executed automatically
 *   // Files restored, temp resources cleaned up
 * } else {
 *   console.log('Success:', result.artifact);
 *   // All commit functions executed
 * }
 * ```
 *
 * @example Real-world CLI usage
 * ```typescript
 * // This is how `wpk generate resource` works internally:
 *
 * const resourcePipeline = createPipeline({
 *   fragmentKind: 'fragment',
 *   builderKind: 'builder',
 *   createContext: (reporter) => ({
 *     reporter,
 *     config: loadKernelConfig(),
 *   }),
 *   buildFragment: (ctx, opts) => {
 *     // Build PHP AST for resource class
 *     return buildResourceClass(opts.input, ctx.config);
 *   },
 *   buildArtifact: async (ctx, opts) => {
 *     // Convert AST to PHP code
 *     const code = await printPhpAst(opts.draft);
 *     return { artifact: code };
 *   },
 * });
 *
 * // Register standard helpers
 * resourcePipeline.registerFragment(phpOpeningTagHelper);
 * resourcePipeline.registerFragment(namespaceHelper);
 * resourcePipeline.registerFragment(useStatementsHelper);
 * resourcePipeline.registerFragment(classDefinitionHelper);
 * resourcePipeline.registerBuilder(writeFileHelper);
 * resourcePipeline.registerBuilder(formatCodeHelper);
 *
 * // User can inject custom helpers via config
 * const userHelpers = loadUserHelpers();
 * userHelpers.forEach(h => resourcePipeline.registerFragment(h));
 *
 * // Execute generation
 * const result = await resourcePipeline.run({
 *   input: { name: 'Post', endpoint: '/posts' }
 * });
 * ```
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
	const diagnostics: TDiagnostic[] = [];
	const loggedDiagnosticsByReporter = new WeakMap<
		TReporter,
		Set<TDiagnostic>
	>();
	let diagnosticReporter: TReporter | undefined;
	const extensionHooks: ExtensionHookEntry<
		TContext,
		TRunOptions,
		TArtifact
	>[] = [];
	const pendingExtensionRegistrations: Promise<void>[] = [];

	const fragmentKindValue = fragmentKind as HelperKind;
	const builderKindValue = builderKind as HelperKind;

	function describeHelper(
		kind: HelperKind,
		helper: HelperDescriptor
	): string {
		if (kind === fragmentKindValue) {
			return `Fragment helper "${helper.key}"`;
		}

		if (kind === builderKindValue) {
			return `Builder helper "${helper.key}"`;
		}

		return `Helper "${helper.key}"`;
	}

	function pushConflictDiagnosticFor(
		helper: HelperDescriptor,
		existing: HelperDescriptor,
		kind: HelperKind,
		message: string
	): void {
		const diagnostic =
			options.createConflictDiagnostic?.({
				helper: helper as unknown as TFragmentHelper | TBuilderHelper,
				existing: existing as unknown as
					| TFragmentHelper
					| TBuilderHelper,
				message,
			}) ??
			({
				type: 'conflict',
				key: helper.key,
				mode: helper.mode,
				helpers: [
					existing.origin ?? existing.key,
					helper.origin ?? helper.key,
				],
				message,
				kind,
			} as unknown as TDiagnostic);

		emitDiagnostic(diagnostic);
	}

	function pushMissingDependencyDiagnosticFor(
		helper: HelperDescriptor,
		dependency: string,
		kind: HelperKind
	): void {
		const message = `${describeHelper(kind, helper)} depends on unknown helper "${dependency}".`;
		const diagnostic =
			options.createMissingDependencyDiagnostic?.({
				helper: helper as unknown as TFragmentHelper | TBuilderHelper,
				dependency,
				message,
			}) ??
			({
				type: 'missing-dependency',
				key: helper.key,
				dependency,
				message,
				kind,
				helper: helper.origin ?? helper.key,
			} as unknown as TDiagnostic);

		emitDiagnostic(diagnostic);
	}

	function pushUnusedHelperDiagnosticFor(
		helper: HelperDescriptor,
		kind: HelperKind,
		reason: string,
		dependsOn: readonly string[]
	): void {
		const message = `${describeHelper(kind, helper)} ${reason}.`;
		const diagnostic =
			options.createUnusedHelperDiagnostic?.({
				helper: helper as unknown as TFragmentHelper | TBuilderHelper,
				message,
			}) ??
			({
				type: 'unused-helper',
				key: helper.key,
				message,
				kind,
				helper: helper.origin ?? helper.key,
				dependsOn,
			} as unknown as TDiagnostic);

		emitDiagnostic(diagnostic);
	}

	function logDiagnostic(diagnostic: TDiagnostic): void {
		if (!diagnosticReporter || !options.onDiagnostic) {
			return;
		}

		const loggedForReporter =
			loggedDiagnosticsByReporter.get(diagnosticReporter);
		if (loggedForReporter?.has(diagnostic)) {
			return;
		}

		const trackingSet = loggedForReporter ?? new Set<TDiagnostic>();
		options.onDiagnostic({
			reporter: diagnosticReporter,
			diagnostic,
		});
		trackingSet.add(diagnostic);
		if (!loggedForReporter) {
			loggedDiagnosticsByReporter.set(diagnosticReporter, trackingSet);
		}
	}

	function emitDiagnostic(diagnostic: TDiagnostic): void {
		diagnostics.push(diagnostic);
		logDiagnostic(diagnostic);
	}

	function reportUnusedHelpers<THelper extends HelperDescriptor>(
		entries: RegisteredHelper<THelper>[],
		visited: Set<string>,
		kind: HelperKind
	): void {
		for (const entry of entries) {
			if (visited.has(entry.id)) {
				continue;
			}

			pushUnusedHelperDiagnosticFor(
				entry.helper as unknown as HelperDescriptor,
				kind,
				'was registered but never executed',
				entry.helper.dependsOn
			);
		}
	}

	function createExecutionSnapshot<
		THelper extends HelperDescriptor<TKind>,
		TKind extends HelperKind,
	>(
		entries: RegisteredHelper<THelper>[],
		visited: Set<string>,
		kind: TKind
	): HelperExecutionSnapshot<TKind> {
		const registered: string[] = [];
		const executed: string[] = [];
		const missing: string[] = [];

		for (const entry of entries) {
			const key = entry.helper.key;
			registered.push(key);

			if (visited.has(entry.id)) {
				executed.push(key);
			} else {
				missing.push(key);
			}
		}

		return {
			kind,
			registered,
			executed,
			missing,
		} satisfies HelperExecutionSnapshot<TKind>;
	}

	function ensureAllHelpersExecuted<
		THelper extends HelperDescriptor<TKind>,
		TKind extends HelperKind,
	>(
		entries: RegisteredHelper<THelper>[],
		snapshot: HelperExecutionSnapshot<TKind>,
		kind: TKind
	): void {
		if (snapshot.missing.length === 0) {
			return;
		}

		// Filter out optional helpers from missing list
		const requiredMissing = entries.filter(
			(entry) =>
				snapshot.missing.includes(entry.helper.key) &&
				!entry.helper.optional
		);

		if (requiredMissing.length === 0) {
			return;
		}

		const missingDescriptions = requiredMissing.map((entry) =>
			describeHelper(kind, entry.helper as unknown as HelperDescriptor)
		);

		throw createError(
			'ValidationError',
			`Pipeline finalisation aborted because ${missingDescriptions.join(', ')} did not execute.`
		);
	}

	// Wrapper functions that close over mutable state
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
				pushConflictDiagnosticFor(
					h,
					existing,
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
				pushConflictDiagnosticFor(
					h,
					existing,
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
			const pending = Promise.resolve(maybePending).then(() => undefined);
			pending.catch(() => {});
			pendingExtensionRegistrations.push(pending);
		}

		return maybePending;
	};

	const waitForPendingExtensionRegistrations = (): MaybePromise<void> => {
		if (pendingExtensionRegistrations.length === 0) {
			return;
		}

		const pending = pendingExtensionRegistrations.splice(
			0,
			pendingExtensionRegistrations.length
		);

		return Promise.all(pending).then(() => undefined);
	};

	interface PipelineRunContext {
		readonly runOptions: TRunOptions;
		readonly buildOptions: TBuildOptions;
		readonly context: TContext;
		readonly draft: TDraft;
		readonly fragmentOrder: RegisteredHelper<TFragmentHelper>[];
		readonly steps: PipelineStep[];
		readonly pushStep: (entry: RegisteredHelper<unknown>) => void;
		readonly builderGraphOptions: CreateDependencyGraphOptions<TBuilderHelper>;
		readonly createHookOptions: (
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

	function createRunContext(runOptions: TRunOptions): PipelineRunContext {
		const buildOptions = options.createBuildOptions(runOptions);
		const context = options.createContext(runOptions);
		diagnosticReporter = context.reporter;
		for (const diagnostic of diagnostics) {
			logDiagnostic(diagnostic);
		}
		const draft = options.createFragmentState({
			options: runOptions,
			context,
			buildOptions,
		});

		const fragmentOrder = createDependencyGraph(
			fragmentEntries,
			{
				onMissingDependency: ({ dependant, dependencyKey }) => {
					const helper = dependant.helper as HelperDescriptor;
					pushMissingDependencyDiagnosticFor(
						helper,
						dependencyKey,
						fragmentKindValue
					);
					pushUnusedHelperDiagnosticFor(
						helper,
						fragmentKindValue,
						`could not execute because dependency "${dependencyKey}" was not found`,
						helper.dependsOn
					);
				},
				onUnresolvedHelpers: ({ unresolved }) => {
					for (const entry of unresolved) {
						const helper = entry.helper as HelperDescriptor;
						pushUnusedHelperDiagnosticFor(
							helper,
							fragmentKindValue,
							'could not execute because its dependencies never resolved',
							helper.dependsOn
						);
					}
				},
			},
			createError
		).order;

		const steps: PipelineStep[] = [];
		const pushStep = (entry: RegisteredHelper<unknown>) => {
			const descriptor = entry.helper as HelperDescriptor;
			steps.push({
				id: entry.id,
				index: steps.length,
				key: descriptor.key,
				kind: descriptor.kind,
				mode: descriptor.mode,
				priority: descriptor.priority,
				dependsOn: descriptor.dependsOn,
				origin: descriptor.origin,
			});
		};

		const builderGraphOptions: CreateDependencyGraphOptions<TBuilderHelper> =
			{
				onMissingDependency: ({ dependant, dependencyKey }) => {
					const helper = dependant.helper as HelperDescriptor;
					pushMissingDependencyDiagnosticFor(
						helper,
						dependencyKey,
						builderKindValue
					);
					pushUnusedHelperDiagnosticFor(
						helper,
						builderKindValue,
						`could not execute because dependency "${dependencyKey}" was not found`,
						helper.dependsOn
					);
				},
				onUnresolvedHelpers: ({ unresolved }) => {
					for (const entry of unresolved) {
						const helper = entry.helper as HelperDescriptor;
						pushUnusedHelperDiagnosticFor(
							helper,
							builderKindValue,
							'could not execute because its dependencies never resolved',
							helper.dependsOn
						);
					}
				},
			};

		const createHookOptionsFn: (hookOptions: {
			context: TContext;
			options: TRunOptions;
			buildOptions: TBuildOptions;
			artifact: TArtifact;
			lifecycle: PipelineExtensionLifecycle;
		}) => PipelineExtensionHookOptions<TContext, TRunOptions, TArtifact> =
			options.createExtensionHookOptions ??
			((hookOptions: {
				context: TContext;
				options: TRunOptions;
				buildOptions: TBuildOptions;
				artifact: TArtifact;
				lifecycle: PipelineExtensionLifecycle;
			}): PipelineExtensionHookOptions<
				TContext,
				TRunOptions,
				TArtifact
			> => ({
				context: hookOptions.context,
				options: hookOptions.options,
				artifact: hookOptions.artifact,
				lifecycle: hookOptions.lifecycle,
			}));

		const createHookOptions = (
			artifact: TArtifact,
			lifecycle: PipelineExtensionLifecycle
		) =>
			createHookOptionsFn({
				context,
				options: runOptions,
				buildOptions,
				artifact,
				lifecycle,
			});

		const handleRollbackError =
			options.onExtensionRollbackError ??
			((rollbackOptions: {
				readonly error: unknown;
				readonly extensionKeys: readonly string[];
				readonly hookSequence: readonly string[];
				readonly errorMetadata: PipelineExtensionRollbackErrorMetadata;
				readonly context: TContext;
			}) => {
				const { reporter } = rollbackOptions.context;
				const warn = reporter.warn;

				if (typeof warn === 'function') {
					warn.call(reporter, 'Pipeline extension rollback failed.', {
						error: rollbackOptions.error,
						errorName: rollbackOptions.errorMetadata.name,
						errorMessage: rollbackOptions.errorMetadata.message,
						errorStack: rollbackOptions.errorMetadata.stack,
						errorCause: rollbackOptions.errorMetadata.cause,
						extensions: rollbackOptions.extensionKeys,
						hookKeys: rollbackOptions.hookSequence,
					});
				}
			});

		return {
			runOptions,
			buildOptions,
			context,
			draft,
			fragmentOrder,
			steps,
			pushStep,
			builderGraphOptions,
			createHookOptions,
			handleRollbackError,
		} satisfies PipelineRunContext;
	}

	const createRunResultFn =
		options.createRunResult ??
		((state: {
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
		}) =>
			({
				artifact: state.artifact,
				diagnostics: state.diagnostics,
				steps: state.steps,
			}) as TRunResult);

	function executeRun(
		runContext: PipelineRunContext
	): MaybePromise<TRunResult> {
		const {
			runOptions,
			buildOptions,
			context,
			draft,
			fragmentOrder,
			steps,
			pushStep,
			builderGraphOptions,
			createHookOptions,
			handleRollbackError,
		} = runContext;

		let builderExecutionSnapshot = createExecutionSnapshot(
			builderEntries,
			new Set<string>(),
			builderKind
		);

		const fragmentVisited = executeHelpers<
			TContext,
			TFragmentInput,
			TFragmentOutput,
			TReporter,
			TFragmentKind,
			TFragmentHelper,
			HelperApplyOptions<
				TContext,
				TFragmentInput,
				TFragmentOutput,
				TReporter
			>
		>(
			fragmentOrder,
			(entry) =>
				options.createFragmentArgs({
					helper: entry.helper,
					options: runOptions,
					context,
					buildOptions,
					draft,
				}),
			(helper, args, next) => helper.apply(args, next),
			(entry) => pushStep(entry)
		);

		return maybeThen(fragmentVisited, (fragmentVisitedSet) => {
			reportUnusedHelpers(
				fragmentEntries,
				fragmentVisitedSet,
				fragmentKindValue
			);

			const fragmentExecution = createExecutionSnapshot(
				fragmentEntries,
				fragmentVisitedSet,
				fragmentKind
			);

			ensureAllHelpersExecuted(
				fragmentEntries,
				fragmentExecution,
				fragmentKindValue
			);

			let artifact = options.finalizeFragmentState({
				draft,
				options: runOptions,
				context,
				buildOptions,
				helpers: { fragments: fragmentExecution },
			});

			const builderOrder = createDependencyGraph(
				builderEntries,
				builderGraphOptions,
				createError
			).order;

			const extensionLifecycle: PipelineExtensionLifecycle =
				'after-fragments';
			const extensionResult = runExtensionHooks(
				extensionHooks,
				extensionLifecycle,
				createHookOptions(artifact, extensionLifecycle),
				({ error, extensionKeys, hookSequence }) =>
					handleRollbackError({
						error,
						extensionKeys,
						hookSequence,
						errorMetadata: createRollbackErrorMetadata(error),
						context,
					})
			);

			const lifecycleHooks = extensionHooks.filter(
				(entry) => entry.lifecycle === extensionLifecycle
			);

			return maybeThen(extensionResult, (extensionState) => {
				artifact = extensionState.artifact;

				const rollbackAndRethrowWith =
					<T>() =>
					(error: unknown): MaybePromise<T> =>
						maybeThen(
							rollbackExtensionResults(
								extensionState.results,
								lifecycleHooks,
								({
									error: rollbackError,
									extensionKeys,
									hookSequence,
								}) =>
									handleRollbackError({
										error: rollbackError,
										extensionKeys,
										hookSequence,
										errorMetadata:
											createRollbackErrorMetadata(
												rollbackError
											),
										context,
									})
							),
							() => {
								throw error;
							}
						);

				const handleRunFailure = rollbackAndRethrowWith<TRunResult>();

				const handleBuilderVisited = (
					builderVisited: Set<string>
				): MaybePromise<TRunResult> => {
					reportUnusedHelpers(
						builderEntries,
						builderVisited,
						builderKindValue
					);

					const builderExecution = createExecutionSnapshot(
						builderEntries,
						builderVisited,
						builderKind
					);

					ensureAllHelpersExecuted(
						builderEntries,
						builderExecution,
						builderKindValue
					);

					builderExecutionSnapshot = builderExecution;

					const finalizeRun = () =>
						createRunResultFn({
							artifact,
							diagnostics: diagnostics.slice(),
							steps,
							context,
							buildOptions,
							options: runOptions,
							helpers: {
								fragments: fragmentExecution,
								builders: builderExecutionSnapshot,
							},
						});

					const handleCommitFailure = rollbackAndRethrowWith<void>();

					const commitAndFinalize = (): MaybePromise<TRunResult> =>
						maybeThen(
							maybeTry(
								() =>
									commitExtensionResults(
										extensionState.results
									),
								handleCommitFailure
							),
							finalizeRun
						);

					return commitAndFinalize();
				};

				const runBuilders = (): MaybePromise<TRunResult> =>
					maybeThen(
						executeHelpers<
							TContext,
							TBuilderInput,
							TBuilderOutput,
							TReporter,
							TBuilderKind,
							TBuilderHelper,
							HelperApplyOptions<
								TContext,
								TBuilderInput,
								TBuilderOutput,
								TReporter
							>
						>(
							builderOrder,
							(entry) =>
								options.createBuilderArgs({
									helper: entry.helper,
									options: runOptions,
									context,
									buildOptions,
									artifact,
								}),
							(helper, args, next) => helper.apply(args, next),
							(entry) => pushStep(entry)
						),
						handleBuilderVisited
					);

				return maybeTry(runBuilders, handleRunFailure);
			});
		});
	}

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
			use(helper) {
				registerFragmentHelper(helper);
			},
		},
		builders: {
			use(helper) {
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
				const handled = maybeThen(registrationResult, (resolved) =>
					handleExtensionResult(extension.key, resolved)
				);

				return trackPendingExtensionRegistration(handled);
			},
		},
		use(helper) {
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
				const runContext = createRunContext(runOptions);
				return executeRun(runContext);
			};

			return maybeThen(waitForPendingExtensionRegistrations(), () =>
				startRun()
			);
		},
	};

	return pipeline;
}
