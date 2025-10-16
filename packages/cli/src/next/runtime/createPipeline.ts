import { KernelError } from '@wpkernel/core/error';
import type { BuildIrOptions, IRv1 } from '../../ir/types';
import {
	createIrDraft,
	createIrFragmentOutput,
	finalizeIrDraft,
} from '../ir/types';
import type {
	BuilderHelper,
	BuilderInput,
	BuilderOutput,
	FragmentHelper,
	FragmentInput,
	FragmentOutput,
	Pipeline,
	PipelineContext,
	PipelineDiagnostic,
	PipelineRunOptions,
	PipelineRunResult,
	PipelineStep,
} from './types';

interface RegisteredHelper<T extends FragmentHelper | BuilderHelper> {
	readonly helper: T;
	readonly id: string;
	readonly index: number;
}

interface DependencyGraphState<T extends FragmentHelper | BuilderHelper> {
	readonly adjacency: Map<string, Set<string>>;
	readonly indegree: Map<string, number>;
	readonly entryById: Map<string, RegisteredHelper<T>>;
}

function createHelperId(
	helper: { kind: string; key: string },
	index: number
): string {
	return `${helper.kind}:${helper.key}#${index}`;
}

function compareHelpers(
	a: RegisteredHelper<FragmentHelper | BuilderHelper>,
	b: RegisteredHelper<FragmentHelper | BuilderHelper>
): number {
	if (a.helper.priority !== b.helper.priority) {
		return b.helper.priority - a.helper.priority;
	}

	if (a.helper.key !== b.helper.key) {
		return a.helper.key.localeCompare(b.helper.key);
	}

	return a.index - b.index;
}

function createGraphState<T extends FragmentHelper | BuilderHelper>(
	entries: RegisteredHelper<T>[]
): DependencyGraphState<T> {
	const adjacency = new Map<string, Set<string>>();
	const indegree = new Map<string, number>();
	const entryById = new Map<string, RegisteredHelper<T>>();

	for (const entry of entries) {
		adjacency.set(entry.id, new Set());
		indegree.set(entry.id, 0);
		entryById.set(entry.id, entry);
	}

	return { adjacency, indegree, entryById };
}

function registerHelperDependencies<T extends FragmentHelper | BuilderHelper>(
	entries: RegisteredHelper<T>[],
	graph: DependencyGraphState<T>
): void {
	for (const entry of entries) {
		for (const dependencyKey of entry.helper.dependsOn) {
			linkDependency(entries, graph, dependencyKey, entry.id);
		}
	}
}

function linkDependency<T extends FragmentHelper | BuilderHelper>(
	entries: RegisteredHelper<T>[],
	graph: DependencyGraphState<T>,
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

function sortByDependencies<T extends FragmentHelper | BuilderHelper>(
	entries: RegisteredHelper<T>[],
	graph: DependencyGraphState<T>
): RegisteredHelper<T>[] {
	const ready = entries.filter(
		(entry) => (graph.indegree.get(entry.id) ?? 0) === 0
	);
	ready.sort(compareHelpers);

	const ordered: RegisteredHelper<T>[] = [];
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

function buildDependencyGraph<T extends FragmentHelper | BuilderHelper>(
	entries: RegisteredHelper<T>[]
): {
	order: RegisteredHelper<T>[];
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
	T extends FragmentHelper | BuilderHelper,
	TInput,
	TOutput,
>(
	ordered: RegisteredHelper<T>[],
	makeArgs: (entry: RegisteredHelper<T>) => {
		context: PipelineContext;
		input: TInput;
		output: TOutput;
		reporter: PipelineContext['reporter'];
	},
	invoke: (
		helper: T,
		args: {
			context: PipelineContext;
			input: TInput;
			output: TOutput;
			reporter: PipelineContext['reporter'];
		},
		next: () => Promise<void>
	) => Promise<void>,
	recordStep: (entry: RegisteredHelper<T>) => void
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

function createBuilderOutput(): BuilderOutput {
	const actions: BuilderOutput['actions'] = [];
	return {
		actions,
		queueWrite(action) {
			actions.push(action);
		},
	};
}

function createFragmentArgs(
	context: PipelineContext,
	options: BuildIrOptions,
	draft: ReturnType<typeof createIrDraft>
): {
	input: FragmentInput;
	output: FragmentOutput;
	context: PipelineContext;
	reporter: PipelineContext['reporter'];
} {
	return {
		context,
		input: {
			options,
			draft,
		},
		output: createIrFragmentOutput(draft),
		reporter: context.reporter,
	};
}

function createBuilderArgs(
	context: PipelineContext,
	options: BuildIrOptions,
	ir: IRv1
): {
	input: BuilderInput;
	output: BuilderOutput;
	context: PipelineContext;
	reporter: PipelineContext['reporter'];
} {
	return {
		context,
		input: {
			phase: context.phase,
			options,
			ir,
		},
		output: createBuilderOutput(),
		reporter: context.reporter,
	};
}

export function createPipeline(): Pipeline {
	const fragmentEntries: RegisteredHelper<FragmentHelper>[] = [];
	const builderEntries: RegisteredHelper<BuilderHelper>[] = [];
	const diagnostics: PipelineDiagnostic[] = [];

	function registerFragment(helper: FragmentHelper): void {
		if (helper.kind !== 'fragment') {
			throw new KernelError('ValidationError', {
				message: `Attempted to register helper "${helper.key}" as fragment but received kind "${helper.kind}".`,
			});
		}

		if (helper.mode === 'override') {
			const existingOverride = fragmentEntries.find(
				(entry) =>
					entry.helper.key === helper.key &&
					entry.helper.mode === 'override'
			);

			if (existingOverride) {
				const message = `Multiple overrides registered for fragment "${helper.key}".`;
				diagnostics.push({
					type: 'conflict',
					key: helper.key,
					mode: 'override',
					helpers: [
						existingOverride.helper.origin ??
							existingOverride.helper.key,
						helper.origin ?? helper.key,
					],
					message,
				});

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

	function registerBuilder(helper: BuilderHelper): void {
		if (helper.kind !== 'builder') {
			throw new KernelError('ValidationError', {
				message: `Attempted to register helper "${helper.key}" as builder but received kind "${helper.kind}".`,
			});
		}

		const index = builderEntries.length;
		builderEntries.push({
			helper,
			id: createHelperId(helper, index),
			index,
		});
	}

	const pipeline: Pipeline = {
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
			use(extension) {
				return extension.register(pipeline);
			},
		},
		use(helper) {
			if (helper.kind === 'fragment') {
				registerFragment(helper as FragmentHelper);
				return;
			}

			registerBuilder(helper as BuilderHelper);
		},
		async run(options: PipelineRunOptions) {
			const buildOptions: BuildIrOptions = {
				config: options.config,
				namespace: options.namespace,
				origin: options.origin,
				sourcePath: options.sourcePath,
			};
			const context: PipelineContext = {
				workspace: options.workspace,
				reporter: options.reporter,
				phase: options.phase,
			};

			const draft = createIrDraft(buildOptions);
			const fragmentOrder = buildDependencyGraph(fragmentEntries).order;
			const steps: PipelineStep[] = [];

			await executeHelpers(
				fragmentOrder,
				() => createFragmentArgs(context, buildOptions, draft),
				async (helper, args, next) => {
					await helper.apply(args, next);
				},
				(entry) => {
					steps.push({
						id: entry.id,
						index: steps.length,
						key: entry.helper.key,
						kind: entry.helper.kind,
						mode: entry.helper.mode,
						priority: entry.helper.priority,
						dependsOn: entry.helper.dependsOn,
						origin: entry.helper.origin,
					});
				}
			);

			const ir = finalizeIrDraft(draft);

			const builderOrder = buildDependencyGraph(builderEntries).order;

			await executeHelpers(
				builderOrder,
				() => createBuilderArgs(context, buildOptions, ir),
				async (helper, args, next) => {
					await helper.apply(args, next);
				},
				(entry) => {
					steps.push({
						id: entry.id,
						index: steps.length,
						key: entry.helper.key,
						kind: entry.helper.kind,
						mode: entry.helper.mode,
						priority: entry.helper.priority,
						dependsOn: entry.helper.dependsOn,
						origin: entry.helper.origin,
					});
				}
			);

			return {
				ir,
				diagnostics: diagnostics.slice(),
				steps,
			} satisfies PipelineRunResult;
		},
	};

	return pipeline;
}
