import { KernelError } from '../error/index.js';
import type { Reporter } from '../reporter/types';
import type {
	CreatePipelineOptions,
	Helper,
	HelperApplyOptions,
	HelperKind,
	HelperDescriptor,
	Pipeline,
	PipelineDiagnostic,
	PipelineExtension,
	PipelineExtensionHook,
	PipelineExtensionHookOptions,
	PipelineExtensionHookResult,
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

interface ExtensionHookEntry<TContext, TOptions, TArtifact> {
	readonly key: string;
	readonly hook: PipelineExtensionHook<TContext, TOptions, TArtifact>;
}

async function runExtensionHooks<TContext, TOptions, TArtifact>(
	hooks: readonly ExtensionHookEntry<TContext, TOptions, TArtifact>[],
	options: PipelineExtensionHookOptions<TContext, TOptions, TArtifact>,
	onRollbackError: (args: {
		readonly error: unknown;
		readonly extensionKeys: readonly string[];
	}) => void
): Promise<{
	artifact: TArtifact;
	results: PipelineExtensionHookResult<TArtifact>[];
}> {
	let artifact = options.artifact;
	const results: PipelineExtensionHookResult<TArtifact>[] = [];

	try {
		for (const entry of hooks) {
			const result = await entry.hook({
				context: options.context,
				options: options.options,
				artifact,
			});

			if (!result) {
				continue;
			}

			if (result.artifact !== undefined) {
				artifact = result.artifact;
			}

			results.push(result);
		}
	} catch (error) {
		await rollbackExtensionResults(results, hooks, onRollbackError);

		throw error;
	}

	return { artifact, results };
}

async function commitExtensionResults<TArtifact>(
	results: readonly PipelineExtensionHookResult<TArtifact>[]
): Promise<void> {
	for (const result of results) {
		if (result.commit) {
			await result.commit();
		}
	}
}

async function rollbackExtensionResults<TContext, TOptions, TArtifact>(
	results: readonly PipelineExtensionHookResult<TArtifact>[],
	hooks: readonly ExtensionHookEntry<TContext, TOptions, TArtifact>[],
	onRollbackError: (args: {
		readonly error: unknown;
		readonly extensionKeys: readonly string[];
	}) => void
): Promise<void> {
	const hookKeys = hooks.map((entry) => entry.key);

	for (const result of [...results].reverse()) {
		if (!result.rollback) {
			continue;
		}

		try {
			await result.rollback();
		} catch (error) {
			onRollbackError({
				error,
				extensionKeys: hookKeys,
			});
		}
	}
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
): void {
	for (const entry of entries) {
		for (const dependencyKey of entry.helper.dependsOn) {
			linkDependency(entries, graph, dependencyKey, entry.id);
		}
	}
}

function linkDependency<THelper extends HelperDescriptor>(
	entries: RegisteredHelper<THelper>[],
	graph: DependencyGraphState<THelper>,
	dependencyKey: string,
	dependantId: string
): void {
	const related = entries.filter(
		({ helper }) => helper.key === dependencyKey
	);
	for (const dependency of related) {
		const neighbours = graph.adjacency.get(dependency.id);
		if (!neighbours) {
			continue;
		}

		neighbours.add(dependantId);
		const current = graph.indegree.get(dependantId) ?? 0;
		graph.indegree.set(dependantId, current + 1);
	}
}

function sortByDependencies<THelper extends HelperDescriptor>(
	entries: RegisteredHelper<THelper>[],
	graph: DependencyGraphState<THelper>
): RegisteredHelper<THelper>[] {
	const ready = entries.filter(
		(entry) => (graph.indegree.get(entry.id) ?? 0) === 0
	);
	ready.sort(compareHelpers);

	const ordered: RegisteredHelper<THelper>[] = [];
	const indegree = new Map(graph.indegree);

	while (ready.length > 0) {
		const current = ready.shift();
		if (!current) {
			break;
		}

		ordered.push(current);

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

	return ordered;
}

function buildDependencyGraph<THelper extends HelperDescriptor>(
	entries: RegisteredHelper<THelper>[]
): {
	order: RegisteredHelper<THelper>[];
	adjacency: Map<string, Set<string>>;
} {
	const graph = createGraphState(entries);
	registerHelperDependencies(entries, graph);
	const ordered = sortByDependencies(entries, graph);

	if (ordered.length !== entries.length) {
		throw new KernelError('ValidationError', {
			message: 'Detected a cycle while ordering pipeline helpers.',
		});
	}

	return { order: ordered, adjacency: graph.adjacency };
}

async function executeHelpers<
	TContext,
	TInput,
	TOutput,
	TReporter extends Reporter,
	TKind extends HelperKind,
	THelper extends Helper<TContext, TInput, TOutput, TReporter, TKind>,
	TArgs extends HelperApplyOptions<TContext, TInput, TOutput, TReporter>,
>(
	ordered: RegisteredHelper<THelper>[],
	makeArgs: (entry: RegisteredHelper<THelper>) => TArgs,
	invoke: (
		helper: THelper,
		args: TArgs,
		next: () => Promise<void>
	) => Promise<void>,
	recordStep: (entry: RegisteredHelper<THelper>) => void
): Promise<void> {
	const visited = new Set<string>();

	async function runAt(index: number): Promise<void> {
		if (index >= ordered.length) {
			return;
		}

		const entry = ordered[index];
		if (!entry) {
			await runAt(index + 1);
			return;
		}
		if (visited.has(entry.id)) {
			await runAt(index + 1);
			return;
		}

		visited.add(entry.id);
		recordStep(entry);

		let nextCalled = false;
		const args = makeArgs(entry);
		const next = async () => {
			if (nextCalled) {
				return;
			}
			nextCalled = true;
			await runAt(index + 1);
		};

		await invoke(entry.helper, args, next);

		if (!nextCalled) {
			await runAt(index + 1);
		}
	}

	await runAt(0);
}

export function createPipeline<
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
	const extensionHooks: ExtensionHookEntry<
		TContext,
		TBuildOptions,
		TArtifact
	>[] = [];

	function registerFragment(helper: TFragmentHelper): void {
		if (helper.kind !== fragmentKind) {
			throw new KernelError('ValidationError', {
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
				const diagnostic =
					options.createConflictDiagnostic?.({
						helper,
						existing: existingOverride.helper,
						message,
					}) ??
					({
						type: 'conflict',
						key: helper.key,
						mode: 'override',
						helpers: [
							existingOverride.helper.origin ??
								existingOverride.helper.key,
							helper.origin ?? helper.key,
						],
						message,
						kind: fragmentKind,
					} as unknown as TDiagnostic);
				diagnostics.push(diagnostic);

				throw new KernelError('ValidationError', {
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
			throw new KernelError('ValidationError', {
				message: `Attempted to register helper "${helper.key}" as ${builderKind} but received kind "${helper.kind}".`,
			});
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

			throw new KernelError('ValidationError', {
				message: `Unsupported helper kind "${helper.kind}".`,
			});
		},
		async run(runOptions: TRunOptions) {
			const buildOptions = options.createBuildOptions(runOptions);
			const context = options.createContext(runOptions);
			const draft = options.createFragmentState({
				options: runOptions,
				context,
				buildOptions,
			});

			const fragmentOrder = buildDependencyGraph(fragmentEntries).order;
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

			await executeHelpers<
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
				async (helper, args, next) => {
					await helper.apply(args, next);
				},
				(entry) => pushStep(entry)
			);

			let artifact = options.finalizeFragmentState({
				draft,
				options: runOptions,
				context,
				buildOptions,
			});
			const builderOrder = buildDependencyGraph(builderEntries).order;

			const createHookOptions =
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

			const handleRollbackError =
				options.onExtensionRollbackError ??
				((rollbackOptions: {
					error: unknown;
					extensionKeys: readonly string[];
					context: TContext;
				}) => {
					rollbackOptions.context.reporter.warn(
						'Pipeline extension rollback failed.',
						{
							error: (rollbackOptions.error as Error).message,
							extensions: rollbackOptions.extensionKeys,
						}
					);
				});

			const extensionResult = await runExtensionHooks(
				extensionHooks,
				createHookOptions({
					context,
					options: runOptions,
					buildOptions,
					artifact,
				}),
				({ error, extensionKeys }) =>
					handleRollbackError({
						error,
						extensionKeys,
						context,
					})
			);
			artifact = extensionResult.artifact;

			try {
				await executeHelpers<
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
					async (helper, args, next) => {
						await helper.apply(args, next);
					},
					(entry) => pushStep(entry)
				);

				await commitExtensionResults(extensionResult.results);
			} catch (error) {
				await rollbackExtensionResults(
					extensionResult.results,
					extensionHooks,
					({ error: rollbackError, extensionKeys }) =>
						handleRollbackError({
							error: rollbackError,
							extensionKeys,
							context,
						})
				);

				throw error;
			}

			const createRunResult =
				options.createRunResult ??
				((state: {
					artifact: TArtifact;
					diagnostics: readonly TDiagnostic[];
					steps: readonly PipelineStep[];
					context: TContext;
					buildOptions: TBuildOptions;
					options: TRunOptions;
				}) =>
					({
						artifact: state.artifact,
						diagnostics: state.diagnostics,
						steps: state.steps,
					}) as TRunResult);

			return createRunResult({
				artifact,
				diagnostics: diagnostics.slice(),
				steps,
				context,
				buildOptions,
				options: runOptions,
			});
		},
	};

	return pipeline;
}
