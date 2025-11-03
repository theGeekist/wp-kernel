import { WPKernelError } from '../error/index.js';
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
	PipelineExtensionHook,
	PipelineExtensionHookOptions,
	PipelineExtensionHookResult,
	PipelineExtensionRollbackErrorMetadata,
	HelperExecutionSnapshot,
	PipelineExecutionMetadata,
	PipelineRunState,
	PipelineStep,
} from './types';

interface RegisteredHelper<THelper> {
	readonly helper: THelper;
	readonly id: string;
	readonly index: number;
}

interface DependencyGraphState<THelper> {
	readonly adjacency: Map<string, Set<string>>;
	readonly indegree: Map<string, number>;
	readonly entryById: Map<string, RegisteredHelper<THelper>>;
}

interface MissingDependencyIssue<THelper> {
	readonly dependant: RegisteredHelper<THelper>;
	readonly dependencyKey: string;
}

interface CreateDependencyGraphOptions<THelper> {
	readonly onMissingDependency?: (
		issue: MissingDependencyIssue<THelper>
	) => void;
	readonly onUnresolvedHelpers?: (options: {
		readonly unresolved: RegisteredHelper<THelper>[];
	}) => void;
}

interface ExtensionHookEntry<TContext, TOptions, TArtifact> {
	readonly key: string;
	readonly hook: PipelineExtensionHook<TContext, TOptions, TArtifact>;
}

interface ExtensionHookExecution<TContext, TOptions, TArtifact> {
	readonly hook: ExtensionHookEntry<TContext, TOptions, TArtifact>;
	readonly result: PipelineExtensionHookResult<TArtifact>;
}

interface RollbackErrorArgs {
	readonly error: unknown;
	readonly extensionKeys: readonly string[];
	readonly hookSequence: readonly string[];
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
	if (
		(typeof value !== 'object' || value === null) &&
		typeof value !== 'function'
	) {
		return false;
	}

	return typeof (value as PromiseLike<unknown>).then === 'function';
}

function maybeThen<T, TResult>(
	value: MaybePromise<T>,
	onFulfilled: (value: T) => MaybePromise<TResult>
): MaybePromise<TResult> {
	if (isPromiseLike(value)) {
		return Promise.resolve(value).then(onFulfilled);
	}

	return onFulfilled(value);
}

function maybeTry<T>(
	run: () => MaybePromise<T>,
	onError: (error: unknown) => MaybePromise<T>
): MaybePromise<T> {
	try {
		const result = run();

		if (isPromiseLike(result)) {
			return Promise.resolve(result).catch((error) => onError(error));
		}

		return result;
	} catch (error) {
		return onError(error);
	}
}

function createRollbackErrorMetadata(
	error: unknown
): PipelineExtensionRollbackErrorMetadata {
	if (error instanceof Error) {
		const { name, message, stack } = error;
		const cause = (error as Error & { cause?: unknown }).cause;

		return {
			name,
			message,
			stack,
			cause,
		};
	}

	if (typeof error === 'string') {
		return {
			message: error,
		};
	}

	return {};
}

function processSequentially<T>(
	items: readonly T[],
	handler: (item: T, index: number) => MaybePromise<void>,
	direction: 'forward' | 'reverse' = 'forward'
): MaybePromise<void> {
	const length = items.length;

	if (length === 0) {
		return;
	}

	const shouldContinue = (index: number) =>
		direction === 'forward' ? index < length : index >= 0;
	const advance = (index: number) =>
		direction === 'forward' ? index + 1 : index - 1;

	const iterate = (startIndex: number): MaybePromise<void> => {
		for (
			let index = startIndex;
			shouldContinue(index);
			index = advance(index)
		) {
			const item = items[index]!;
			const result = handler(item, index);

			if (isPromiseLike(result)) {
				return Promise.resolve(result).then(() =>
					iterate(advance(index))
				);
			}
		}
	};

	const start = direction === 'forward' ? 0 : length - 1;

	return iterate(start);
}

function runExtensionHooks<TContext, TOptions, TArtifact>(
	hooks: readonly ExtensionHookEntry<TContext, TOptions, TArtifact>[],
	options: PipelineExtensionHookOptions<TContext, TOptions, TArtifact>,
	onRollbackError: (args: RollbackErrorArgs) => void
): MaybePromise<{
	artifact: TArtifact;
	results: ExtensionHookExecution<TContext, TOptions, TArtifact>[];
}> {
	let artifact = options.artifact;
	const results: ExtensionHookExecution<TContext, TOptions, TArtifact>[] = [];

	const process = () =>
		processSequentially(hooks, (entry) => {
			const hookResult = entry.hook({
				context: options.context,
				options: options.options,
				artifact,
			});

			if (isPromiseLike(hookResult)) {
				return Promise.resolve(hookResult).then((resolved) => {
					if (!resolved) {
						return undefined;
					}

					if (resolved.artifact !== undefined) {
						artifact = resolved.artifact;
					}

					results.push({
						hook: entry,
						result: resolved,
					});

					return undefined;
				});
			}

			if (!hookResult) {
				return undefined;
			}

			if (hookResult.artifact !== undefined) {
				artifact = hookResult.artifact;
			}

			return void results.push({
				hook: entry,
				result: hookResult,
			});
		});

	const processed = maybeTry(process, (error) =>
		maybeThen(
			rollbackExtensionResults(results, hooks, onRollbackError),
			() => {
				throw error;
			}
		)
	);

	return maybeThen(processed, () => ({ artifact, results }));
}

function commitExtensionResults<TContext, TOptions, TArtifact>(
	results: readonly ExtensionHookExecution<TContext, TOptions, TArtifact>[]
): MaybePromise<void> {
	return processSequentially(results, (execution) => {
		const commit = execution.result.commit;
		if (!commit) {
			return undefined;
		}

		const commitResult = commit();
		if (isPromiseLike(commitResult)) {
			return commitResult.then(() => undefined);
		}

		return undefined;
	});
}

function rollbackExtensionResults<TContext, TOptions, TArtifact>(
	results: readonly ExtensionHookExecution<TContext, TOptions, TArtifact>[],
	hooks: readonly ExtensionHookEntry<TContext, TOptions, TArtifact>[],
	onRollbackError: (args: RollbackErrorArgs) => void
): MaybePromise<void> {
	const hookKeys = hooks.map((entry) => entry.key);
	const hookSequence = hookKeys;

	return processSequentially(
		[...results].reverse(),
		(execution) => {
			const rollback = execution.result.rollback;
			if (!rollback) {
				return;
			}

			return maybeTry(
				() => rollback(),
				(error) => {
					onRollbackError({
						error,
						extensionKeys: hookKeys,
						hookSequence,
					});

					return undefined;
				}
			);
		},
		'forward'
	);
}

function createHelperId(
	helper: { kind: HelperKind; key: string },
	index: number
): string {
	return `${helper.kind}:${helper.key}#${index}`;
}

function compareHelpers<THelper extends HelperDescriptor>(
	a: RegisteredHelper<THelper>,
	b: RegisteredHelper<THelper>
): number {
	if (a.helper.priority !== b.helper.priority) {
		return b.helper.priority - a.helper.priority;
	}

	if (a.helper.key !== b.helper.key) {
		return a.helper.key.localeCompare(b.helper.key);
	}

	return a.index - b.index;
}

function createGraphState<THelper>(
	entries: RegisteredHelper<THelper>[]
): DependencyGraphState<THelper> {
	const adjacency = new Map<string, Set<string>>();
	const indegree = new Map<string, number>();
	const entryById = new Map<string, RegisteredHelper<THelper>>();

	for (const entry of entries) {
		adjacency.set(entry.id, new Set());
		indegree.set(entry.id, 0);
		entryById.set(entry.id, entry);
	}

	return { adjacency, indegree, entryById };
}

function registerHelperDependencies<THelper extends HelperDescriptor>(
	entries: RegisteredHelper<THelper>[],
	graph: DependencyGraphState<THelper>
): MissingDependencyIssue<THelper>[] {
	const missing: MissingDependencyIssue<THelper>[] = [];

	for (const entry of entries) {
		for (const dependencyKey of entry.helper.dependsOn) {
			const linked = linkDependency(
				entries,
				graph,
				dependencyKey,
				entry.id
			);

			if (!linked) {
				missing.push({
					dependant: entry,
					dependencyKey,
				});
			}
		}
	}

	return missing;
}

function linkDependency<THelper extends HelperDescriptor>(
	entries: RegisteredHelper<THelper>[],
	graph: DependencyGraphState<THelper>,
	dependencyKey: string,
	dependantId: string
): boolean {
	const related = entries.filter(
		({ helper }) => helper.key === dependencyKey
	);

	if (related.length === 0) {
		return false;
	}

	for (const dependency of related) {
		const neighbours = graph.adjacency.get(dependency.id);
		if (!neighbours) {
			continue;
		}

		neighbours.add(dependantId);
		const current = graph.indegree.get(dependantId) ?? 0;
		graph.indegree.set(dependantId, current + 1);
	}

	return true;
}

function sortByDependencies<THelper extends HelperDescriptor>(
	entries: RegisteredHelper<THelper>[],
	graph: DependencyGraphState<THelper>
): {
	ordered: RegisteredHelper<THelper>[];
	unresolved: RegisteredHelper<THelper>[];
} {
	const ready = entries.filter(
		(entry) => (graph.indegree.get(entry.id) ?? 0) === 0
	);
	ready.sort(compareHelpers);

	const ordered: RegisteredHelper<THelper>[] = [];
	const indegree = new Map(graph.indegree);
	const visited = new Set<string>();

	while (ready.length > 0) {
		const current = ready.shift();
		if (!current) {
			break;
		}

		ordered.push(current);
		visited.add(current.id);

		const neighbours = graph.adjacency.get(current.id);
		if (!neighbours) {
			continue;
		}

		for (const neighbourId of neighbours) {
			const nextValue = (indegree.get(neighbourId) ?? 0) - 1;
			indegree.set(neighbourId, nextValue);
			if (nextValue !== 0) {
				continue;
			}

			const neighbour = graph.entryById.get(neighbourId);
			if (!neighbour) {
				continue;
			}

			ready.push(neighbour);
			ready.sort(compareHelpers);
		}
	}

	const unresolved = entries.filter((entry) => !visited.has(entry.id));

	return { ordered, unresolved };
}

function createDependencyGraph<THelper extends HelperDescriptor>(
	entries: RegisteredHelper<THelper>[],
	options?: CreateDependencyGraphOptions<THelper>
): {
	order: RegisteredHelper<THelper>[];
	adjacency: Map<string, Set<string>>;
} {
	const graph = createGraphState(entries);
	const missing = registerHelperDependencies(entries, graph);

	if (missing.length > 0) {
		for (const issue of missing) {
			options?.onMissingDependency?.(issue);
		}

		const [firstIssue] = missing;
		if (firstIssue) {
			const dependantKey = firstIssue.dependant.helper.key;
			throw new WPKernelError('ValidationError', {
				message: `Helper "${dependantKey}" depends on unknown helper "${firstIssue.dependencyKey}".`,
			});
		}

		throw new WPKernelError('ValidationError', {
			message: 'Detected unresolved helper dependencies.',
		});
	}

	const { ordered, unresolved } = sortByDependencies(entries, graph);

	if (unresolved.length > 0) {
		options?.onUnresolvedHelpers?.({ unresolved });
		const unresolvedKeys = unresolved.map((entry) => entry.helper.key);

		throw new WPKernelError('ValidationError', {
			message: `Detected unresolved pipeline helpers: ${unresolvedKeys.join(', ')}.`,
		});
	}

	return { order: ordered, adjacency: graph.adjacency };
}

function executeHelpers<
	TContext,
	TInput,
	TOutput,
	TReporter extends PipelineReporter,
	TKind extends HelperKind,
	THelper extends Helper<TContext, TInput, TOutput, TReporter, TKind>,
	TArgs extends HelperApplyOptions<TContext, TInput, TOutput, TReporter>,
>(
	ordered: RegisteredHelper<THelper>[],
	makeArgs: (entry: RegisteredHelper<THelper>) => TArgs,
	invoke: (
		helper: THelper,
		args: TArgs,
		next: () => MaybePromise<void>
	) => MaybePromise<void>,
	recordStep: (entry: RegisteredHelper<THelper>) => void
): MaybePromise<Set<string>> {
	const visited = new Set<string>();

	function runAtAsync(index: number): Promise<void> {
		const continuation = runAt(index);
		if (isPromiseLike(continuation)) {
			return Promise.resolve(continuation).then(() => undefined);
		}

		return Promise.resolve();
	}

	function runAt(index: number): MaybePromise<void> {
		if (index >= ordered.length) {
			return;
		}

		const entry = ordered[index];
		if (!entry) {
			return runAt(index + 1);
		}

		if (visited.has(entry.id)) {
			return runAt(index + 1);
		}

		visited.add(entry.id);
		recordStep(entry);

		let nextCalled = false;
		let nextResult: MaybePromise<void> | undefined;
		const args = makeArgs(entry);

		const next = (): MaybePromise<void> => {
			if (nextCalled) {
				return nextResult;
			}

			nextCalled = true;
			const continuation = runAt(index + 1);
			nextResult = continuation;
			return continuation;
		};

		const invocation = invoke(entry.helper, args, next);

		if (isPromiseLike(invocation)) {
			return Promise.resolve(invocation).then(() => {
				if (!nextCalled) {
					return runAtAsync(index + 1);
				}

				if (isPromiseLike(nextResult)) {
					return nextResult;
				}

				return undefined;
			});
		}

		if (nextCalled) {
			return nextResult;
		}

		return runAt(index + 1);
	}

	const execution = runAt(0);

	if (isPromiseLike(execution)) {
		return execution.then(() => visited);
	}

	return visited;
}

/**
 * Creates a pipeline orchestrator—the execution engine that powers WP Kernel's entire code generation infrastructure.
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
		TBuildOptions,
		TArtifact
	>[] = [];

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

		const missingDescriptions = entries
			.filter((entry) => snapshot.missing.includes(entry.helper.key))
			.map((entry) =>
				describeHelper(
					kind,
					entry.helper as unknown as HelperDescriptor
				)
			);

		throw new WPKernelError('ValidationError', {
			message: `Pipeline finalisation aborted because ${missingDescriptions.join(
				', '
			)} did not execute.`,
		});
	}

	function registerFragment(helper: TFragmentHelper): void {
		if (helper.kind !== fragmentKind) {
			throw new WPKernelError('ValidationError', {
				message: `Attempted to register helper "${helper.key}" as ${fragmentKind} but received kind "${helper.kind}".`,
			});
		}

		if (helper.mode === 'override') {
			const existingOverride = fragmentEntries.find(
				(entry) =>
					entry.helper.key === helper.key &&
					entry.helper.mode === 'override'
			);

			if (existingOverride) {
				const message = `Multiple overrides registered for helper "${helper.key}".`;
				pushConflictDiagnosticFor(
					helper,
					existingOverride.helper,
					fragmentKindValue,
					message
				);

				throw new WPKernelError('ValidationError', {
					message,
				});
			}
		}

		const index = fragmentEntries.length;
		fragmentEntries.push({
			helper,
			id: createHelperId(helper, index),
			index,
		});
	}

	function registerBuilder(helper: TBuilderHelper): void {
		if (helper.kind !== builderKind) {
			throw new WPKernelError('ValidationError', {
				message: `Attempted to register helper "${helper.key}" as ${builderKind} but received kind "${helper.kind}".`,
			});
		}

		if (helper.mode === 'override') {
			const existingOverride = builderEntries.find(
				(entry) =>
					entry.helper.key === helper.key &&
					entry.helper.mode === 'override'
			);

			if (existingOverride) {
				const message = `Multiple overrides registered for helper "${helper.key}".`;
				pushConflictDiagnosticFor(
					helper,
					existingOverride.helper,
					builderKindValue,
					message
				);

				throw new WPKernelError('ValidationError', {
					message,
				});
			}
		}

		const index = builderEntries.length;
		builderEntries.push({
			helper,
			id: createHelperId(helper, index),
			index,
		});
	}

	function registerExtensionHook(
		key: string | undefined,
		hook: PipelineExtensionHook<TContext, TBuildOptions, TArtifact>
	): void {
		const resolvedKey =
			key ?? `pipeline.extension#${extensionHooks.length + 1}`;
		extensionHooks.push({
			key: resolvedKey,
			hook,
		});
	}

	function handleExtensionRegisterResult(
		extensionKey: string | undefined,
		result: unknown
	): unknown {
		if (typeof result === 'function') {
			registerExtensionHook(
				extensionKey,
				result as PipelineExtensionHook<
					TContext,
					TBuildOptions,
					TArtifact
				>
			);
			return undefined;
		}

		return result;
	}

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
			artifact: TArtifact
		) => PipelineExtensionHookOptions<TContext, TBuildOptions, TArtifact>;
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

		const fragmentOrder = createDependencyGraph(fragmentEntries, {
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
		}).order;

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

		const createHookOptionsFn =
			options.createExtensionHookOptions ??
			((hookOptions: {
				context: TContext;
				options: TRunOptions;
				buildOptions: TBuildOptions;
				artifact: TArtifact;
			}): PipelineExtensionHookOptions<
				TContext,
				TBuildOptions,
				TArtifact
			> => ({
				context: hookOptions.context,
				options: hookOptions.buildOptions,
				artifact: hookOptions.artifact,
			}));

		const createHookOptions = (artifact: TArtifact) =>
			createHookOptionsFn({
				context,
				options: runOptions,
				buildOptions,
				artifact,
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
				builderGraphOptions
			).order;

			const extensionResult = runExtensionHooks(
				extensionHooks,
				createHookOptions(artifact),
				({ error, extensionKeys, hookSequence }) =>
					handleRollbackError({
						error,
						extensionKeys,
						hookSequence,
						errorMetadata: createRollbackErrorMetadata(error),
						context,
					})
			);

			return maybeThen(extensionResult, (extensionState) => {
				artifact = extensionState.artifact;

				const rollbackAndRethrowWith =
					<T>() =>
					(error: unknown): MaybePromise<T> =>
						maybeThen(
							rollbackExtensionResults(
								extensionState.results,
								extensionHooks,
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
				registerFragment(helper);
			},
		},
		builders: {
			use(helper) {
				registerBuilder(helper);
			},
		},
		extensions: {
			use(
				extension: PipelineExtension<
					PipelineInstance,
					TContext,
					TBuildOptions,
					TArtifact
				>
			) {
				const registrationResult = extension.register(pipeline);

				if (
					registrationResult &&
					typeof (registrationResult as Promise<unknown>)?.then ===
						'function'
				) {
					return (registrationResult as Promise<unknown>).then(
						(resolved) =>
							handleExtensionRegisterResult(
								extension.key,
								resolved
							)
					);
				}

				return handleExtensionRegisterResult(
					extension.key,
					registrationResult
				);
			},
		},
		use(helper) {
			if (helper.kind === fragmentKind) {
				registerFragment(helper as TFragmentHelper);
				return;
			}

			if (helper.kind === builderKind) {
				registerBuilder(helper as TBuilderHelper);
				return;
			}

			throw new WPKernelError('ValidationError', {
				message: `Unsupported helper kind "${helper.kind}".`,
			});
		},
		run(runOptions: TRunOptions) {
			const runContext = createRunContext(runOptions);
			return executeRun(runContext);
		},
	};

	return pipeline;
}
