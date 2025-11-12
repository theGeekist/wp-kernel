import type { PipelineExtension } from '../types';

/**
 * Identifier for a pipeline extension factory.
 */
export interface ExtensionFactorySignature<TOptions = unknown> {
	/**
	 * Human readable name for documentation and diagnostics.
	 */
	readonly name: string;
	/**
	 * Suffix appended to the canonical pipeline extension namespace.
	 */
	readonly slug: string;
	/**
	 * Shape of the options object accepted by the factory.
	 */
	readonly options: TOptions;
}

/**
 * Behavioural contract borrowed or inspired from listr2.
 */
export interface Listr2Carryover {
	/**
	 * Name of the listr2 primitive we are modelling.
	 */
	readonly feature: string;
	/**
	 * Linkable reference into the listr2 source tree for provenance.
	 */
	readonly sourceModule: string;
	/**
	 * Summary of what we are extracting.
	 */
	readonly notes: string;
}

/**
 * Individual behaviour exposed by an extension blueprint.
 */
export interface ExtensionBehaviour {
	readonly name: string;
	readonly description: string;
	readonly helperAnnotations?: readonly string[];
	readonly reporterEvents?: readonly string[];
	readonly listr2?: readonly Listr2Carryover[];
}

/**
 * Documentation-first blueprint for an extension incubated in this package.
 */
export interface ExtensionBlueprint {
	readonly id: string;
	readonly status: 'planned' | 'in-development';
	readonly summary: string;
	readonly factory?: ExtensionFactorySignature;
	readonly behaviours: readonly ExtensionBehaviour[];
	readonly pipelineTouchPoints: readonly string[];
	readonly rolloutNotes: readonly string[];
}

/**
 * Pipeline extension factory type used throughout the blueprints.
 */
export type AnyPipelineExtensionFactory = (
	options?: unknown
) => PipelineExtension<unknown, unknown, unknown, unknown>;

/**
 * Blueprint catalogue for official extensions that the pipeline team will own.
 */
export const OFFICIAL_EXTENSION_BLUEPRINTS: readonly ExtensionBlueprint[] = [
	{
		id: 'live-runner',
		status: 'in-development',
		summary:
			'Provides live progress, retry orchestration, and interactive prompts powered by reporter events.',
		factory: {
			name: 'createLivePipelineRunExtension',
			slug: 'live-runner',
			options: {
				renderer: 'PipelineReporterRenderer',
				retries:
					'{ default: number; helpers?: Record<string, number>; }',
				prompts: 'PromptAdapter',
			},
		},
		behaviours: [
			{
				name: 'Live progress renderer',
				description:
					'Stream helper lifecycle events to a renderer so users can observe DAG execution in real time.',
				reporterEvents: [
					'pipeline:run:started',
					'pipeline:helper:started',
					'pipeline:helper:succeeded',
					'pipeline:helper:failed',
				],
				listr2: [
					{
						feature: 'DefaultRenderer',
						sourceModule:
							'packages/core/src/renderer/default.renderer.ts',
						notes: 'Borrow structured frame updates (task title, state, log lines) to inform our reporter payloads.',
					},
				],
			},
			{
				name: 'Retry and recovery prompts',
				description:
					'Allow helpers to declare retry policies and surface interactive prompts when failures occur.',
				helperAnnotations: [
					'helper.meta.retryPolicy',
					'helper.meta.prompt',
				],
				listr2: [
					{
						feature: 'retryable task wrapper',
						sourceModule: 'packages/core/src/lib/task.ts',
						notes: "Mirror listr2's exponential backoff handling and failure messaging while keeping deterministic ordering.",
					},
				],
			},
			{
				name: 'Reporter-driven telemetry',
				description:
					'Emit structured progress payloads so headless environments can capture telemetry without a TTY renderer.',
				reporterEvents: [
					'pipeline:progress:update',
					'pipeline:retry:scheduled',
					'pipeline:retry:completed',
				],
			},
		],
		pipelineTouchPoints: [
			'Consumes helper-provided metadata via createHelper() options.',
			'Subscribes to reporter hooks exposed on the pipeline context.',
			'Registers a single extension hook through createPipelineExtension.',
		],
		rolloutNotes: [
			'Full extension keys are constructed with the pipeline namespace constant from @wpkernel/core/contracts.',
			'Initial milestone focuses on read-only telemetry to validate event semantics.',
			'Interactive prompts ship once reporter transport supports stdin multiplexing.',
			'Retries remain deterministic by respecting helper dependency ordering.',
		],
	},
	{
		id: 'concurrency',
		status: 'planned',
		summary:
			'Adds a scheduler that can run independent helper branches in parallel without violating dependency constraints.',
		factory: {
			name: 'createDeterministicConcurrencyExtension',
			slug: 'concurrency',
			options: {
				maxConcurrency: 'number | "auto"',
				groups: 'Record<string, number>',
			},
		},
		behaviours: [
			{
				name: 'Deterministic worker pool',
				description:
					'Implements a ready-queue executor that only schedules helpers whose dependencies have settled.',
				helperAnnotations: ['helper.meta.concurrencyGroup'],
				listr2: [
					{
						feature: 'Task concurrency scheduler',
						sourceModule: 'packages/core/src/lib/task-wrapper.ts',
						notes: 'Reference the worker pool contract while adapting it to DAG-based dependency tracking.',
					},
				],
			},
			{
				name: 'Reporter integration',
				description:
					'Propagates worker state (idle, busy, saturated) via reporter events so renderers can show resource usage.',
				reporterEvents: [
					'pipeline:concurrency:queue',
					'pipeline:concurrency:worker-state',
				],
			},
		],
		pipelineTouchPoints: [
			'Wraps executeHelpers() with a concurrency-aware scheduler.',
			'Requires dependency graph snapshots for ready-queue calculation.',
			'Extends helper registration validation to guard conflicting group caps.',
		],
		rolloutNotes: [
			'Full extension keys are constructed with the pipeline namespace constant from @wpkernel/core/contracts.',
			'Prototype with read-only metrics before enabling true parallel execution.',
			'Guarantee stable helper ordering for equal-priority tasks to aid reproducibility.',
		],
	},
	{
		id: 'listr2-bridge',
		status: 'planned',
		summary:
			'Optional adapter that reuses listr2 renderers when the dependency is available at runtime.',
		factory: {
			name: 'createListr2BridgeExtension',
			slug: 'listr2-bridge',
			options: {
				renderer: 'ListrRenderer | undefined',
			},
		},
		behaviours: [
			{
				name: 'Renderer compatibility',
				description:
					'Translate pipeline reporter events into the listr2 renderer API without requiring callers to author listr2 tasks.',
				listr2: [
					{
						feature: 'ListrTaskEventManager',
						sourceModule: 'packages/core/src/lib/event-manager.ts',
						notes: 'Map pipeline helper lifecycle events to listr2 task states and log levels.',
					},
				],
			},
			{
				name: 'Lazy dependency detection',
				description:
					'Resolve the listr2 package at runtime and fall back gracefully when it is absent.',
			},
		],
		pipelineTouchPoints: [
			'Decorates reporter callbacks with listr2-compatible payloads.',
			'Does not mutate helper descriptors or pipeline options.',
		],
		rolloutNotes: [
			'Full extension keys are constructed with the pipeline namespace constant from @wpkernel/core/contracts.',
			'Bridge remains an optional extension to avoid bundling listr2 as a hard dependency.',
			'Acts as a migration path for teams currently using listr2 directly.',
		],
	},
];

export type { ExtensionBlueprint as OfficialExtensionBlueprint };
