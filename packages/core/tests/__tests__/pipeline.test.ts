import { createHelper, createPipeline } from '../../src/pipeline/index.js';
import type {
	ConflictDiagnostic,
	Helper,
	PipelineStep,
} from '../../src/pipeline/index.js';
import { createNoopReporter } from '../../src/reporter/index.js';
import type { Reporter } from '../../src/reporter/types.js';
import { KernelError } from '../../src/error/index.js';

describe('pipeline primitives', () => {
	interface TestRunOptions {
		readonly reporter: Reporter;
		readonly workspace: string;
		readonly seed: number;
	}

	interface TestBuildOptions {
		readonly seed: number;
	}

	interface TestContext {
		readonly reporter: Reporter;
		readonly workspace: string;
		readonly phase: 'test';
		readonly logs: string[];
	}

	interface DraftState {
		values: number[];
	}

	interface FragmentInput {
		readonly seed: number;
		readonly draft: DraftState;
	}

	interface FragmentOutput {
		readonly draft: DraftState;
		append: (value: number) => void;
	}

	interface BuilderInput {
		readonly values: number[];
	}

	interface BuilderOutput {
		readonly actions: string[];
		queue: (action: string) => void;
	}

	interface TestRunResult {
		readonly artifact: number[];
		readonly diagnostics: readonly ConflictDiagnostic[];
		readonly steps: readonly PipelineStep[];
		readonly logs: readonly string[];
	}

	type FragmentApplyArgs = Parameters<
		Helper<TestContext, FragmentInput, FragmentOutput>['apply']
	>[0];
	type BuilderApplyArgs = Parameters<
		Helper<TestContext, BuilderInput, BuilderOutput>['apply']
	>[0];

	function createTestPipeline() {
		return createPipeline<
			TestRunOptions,
			TestBuildOptions,
			TestContext,
			Reporter,
			DraftState,
			number[],
			ConflictDiagnostic,
			TestRunResult,
			FragmentInput,
			FragmentOutput,
			BuilderInput,
			BuilderOutput
		>({
			fragmentKind: 'fragment',
			builderKind: 'builder',
			createBuildOptions(runOptions) {
				return { seed: runOptions.seed } satisfies TestBuildOptions;
			},
			createContext(runOptions) {
				return {
					reporter: runOptions.reporter,
					workspace: runOptions.workspace,
					phase: 'test',
					logs: [],
				} satisfies TestContext;
			},
			createFragmentState() {
				return { values: [] } satisfies DraftState;
			},
			createFragmentArgs({ context, buildOptions, draft }) {
				return {
					context,
					input: {
						seed: buildOptions.seed,
						draft,
					},
					output: {
						draft,
						append(value: number) {
							draft.values.push(value);
						},
					},
					reporter: context.reporter,
				} satisfies FragmentApplyArgs;
			},
			finalizeFragmentState({ draft }) {
				return draft.values.slice();
			},
			createBuilderArgs({ context, artifact }) {
				const actions: string[] = [];
				return {
					context,
					input: {
						values: artifact.slice(),
					},
					output: {
						actions,
						queue(action: string) {
							actions.push(action);
							context.logs.push(`queued:${action}`);
						},
					},
					reporter: context.reporter,
				} satisfies BuilderApplyArgs;
			},
			createRunResult({ artifact, diagnostics, steps, context }) {
				return {
					artifact,
					diagnostics,
					steps,
					logs: context.logs.slice(),
				} satisfies TestRunResult;
			},
		});
	}

	it('orders helpers and runs fragments before builders', async () => {
		const reporter = createNoopReporter();
		const pipeline = createTestPipeline();

		const seedFragment = createHelper<
			TestContext,
			FragmentInput,
			FragmentOutput,
			Reporter,
			'fragment'
		>({
			key: 'fragment.seed',
			kind: 'fragment',
			async apply({ input, output }) {
				output.append(input.seed);
			},
		});

		const doubleFragment = createHelper<
			TestContext,
			FragmentInput,
			FragmentOutput,
			Reporter,
			'fragment'
		>({
			key: 'fragment.double',
			kind: 'fragment',
			dependsOn: ['fragment.seed'],
			async apply({ input, output }) {
				output.append(input.seed * 2);
			},
		});

		const logBuilder = createHelper<
			TestContext,
			BuilderInput,
			BuilderOutput,
			Reporter,
			'builder'
		>({
			key: 'builder.log',
			kind: 'builder',
			async apply({ context, input, output }) {
				context.logs.push(`values:${input.values.join(',')}`);
				output.queue('write');
			},
		});

		// Register in reverse to validate dependency ordering.
		pipeline.ir.use(doubleFragment);
		pipeline.ir.use(seedFragment);
		pipeline.builders.use(logBuilder);

		const result = await pipeline.run({
			reporter,
			workspace: '/tmp/workspace',
			seed: 3,
		});

		expect(result.artifact).toEqual([3, 6]);
		expect(result.logs).toEqual(['values:3,6', 'queued:write']);
		expect(result.diagnostics).toHaveLength(0);
		expect(result.steps.map((step) => step.key)).toEqual([
			'fragment.seed',
			'fragment.double',
			'builder.log',
		]);
	});

	it('rejects duplicate override registrations', () => {
		const pipeline = createTestPipeline();

		const overrideA = createHelper<
			TestContext,
			FragmentInput,
			FragmentOutput,
			Reporter,
			'fragment'
		>({
			key: 'fragment.override',
			kind: 'fragment',
			mode: 'override',
			async apply() {
				// no-op
			},
		});

		const overrideB = createHelper<
			TestContext,
			FragmentInput,
			FragmentOutput,
			Reporter,
			'fragment'
		>({
			key: 'fragment.override',
			kind: 'fragment',
			mode: 'override',
			async apply() {
				// no-op
			},
		});

		pipeline.ir.use(overrideA);

		expect(() => pipeline.ir.use(overrideB)).toThrow(KernelError);
	});
});
