import { createHelper, createPipeline } from '../../src/pipeline/index.js';
import type {
	CreatePipelineOptions,
	Helper,
	PipelineDiagnostic,
	PipelineStep,
	FragmentFinalizationMetadata,
	PipelineExecutionMetadata,
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
		readonly diagnostics: readonly PipelineDiagnostic[];
		readonly steps: readonly PipelineStep[];
		readonly logs: readonly string[];
	}

	type FragmentApplyArgs = Parameters<
		Helper<TestContext, FragmentInput, FragmentOutput>['apply']
	>[0];
	type BuilderApplyArgs = Parameters<
		Helper<TestContext, BuilderInput, BuilderOutput>['apply']
	>[0];

	type TestPipelineOptions = CreatePipelineOptions<
		TestRunOptions,
		TestBuildOptions,
		TestContext,
		Reporter,
		DraftState,
		number[],
		PipelineDiagnostic,
		TestRunResult,
		FragmentInput,
		FragmentOutput,
		BuilderInput,
		BuilderOutput,
		'fragment',
		'builder'
	>;

	function createTestPipeline(overrides: Partial<TestPipelineOptions> = {}) {
		const options: TestPipelineOptions = {
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
		} satisfies TestPipelineOptions;

		return createPipeline({
			...options,
			...overrides,
		});
	}

	type TestPipelineInstance = ReturnType<typeof createTestPipeline>;

	interface RecordedRollbackMetadata {
		readonly name?: string;
		readonly message?: string;
		readonly stack?: string;
		readonly cause?: unknown;
	}

	interface RecordedRollback {
		readonly error: unknown;
		readonly extensionKeys: readonly string[];
		readonly hookSequence: readonly string[];
		readonly errorMetadata: RecordedRollbackMetadata;
	}

	type RollbackHandlerOptions = RecordedRollback & { context: TestContext };

	function createMockReporter(overrides: Partial<Reporter> = {}): Reporter {
		const reporter = {} as Reporter;
		reporter.info = overrides.info ?? (() => undefined);
		reporter.warn = overrides.warn ?? (() => undefined);
		reporter.error = overrides.error ?? (() => undefined);
		reporter.debug = overrides.debug ?? (() => undefined);
		reporter.child = overrides.child ?? (() => reporter);
		return reporter;
	}

	function registerFailingExtensionHooks(
		pipeline: TestPipelineInstance,
		rollbackError: Error,
		extensionError: Error
	): void {
		pipeline.extensions.use({
			key: 'extension.rollback',
			register: () => async () => ({
				rollback: async () => {
					throw rollbackError;
				},
			}),
		});

		pipeline.extensions.use({
			key: 'extension.failure',
			register: () => async () => {
				throw extensionError;
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

	it('rejects duplicate builder override registrations', () => {
		const pipeline = createTestPipeline();

		const overrideA = createHelper<
			TestContext,
			BuilderInput,
			BuilderOutput,
			Reporter,
			'builder'
		>({
			key: 'builder.override',
			kind: 'builder',
			mode: 'override',
			async apply() {
				// no-op
			},
		});

		const overrideB = createHelper<
			TestContext,
			BuilderInput,
			BuilderOutput,
			Reporter,
			'builder'
		>({
			key: 'builder.override',
			kind: 'builder',
			mode: 'override',
			async apply() {
				// no-op
			},
		});

		pipeline.builders.use(overrideA);

		expect(() => pipeline.builders.use(overrideB)).toThrow(KernelError);
	});

	it('provides helper execution metadata to finalisation and run results', async () => {
		const reporter = createNoopReporter();
		const finalisationMetadata: FragmentFinalizationMetadata<'fragment'>[] =
			[];
		const runMetadata: PipelineExecutionMetadata<'fragment', 'builder'>[] =
			[];
		const pipeline = createTestPipeline({
			finalizeFragmentState({ draft, helpers }) {
				finalisationMetadata.push(helpers);
				return draft.values.slice();
			},
			createRunResult({
				artifact,
				diagnostics,
				steps,
				context,
				helpers,
			}) {
				runMetadata.push(helpers);
				return {
					artifact,
					diagnostics,
					steps,
					logs: context.logs.slice(),
				} satisfies TestRunResult;
			},
		});

		const firstFragment = createHelper<
			TestContext,
			FragmentInput,
			FragmentOutput,
			Reporter,
			'fragment'
		>({
			key: 'fragment.alpha',
			kind: 'fragment',
			async apply({ output }: FragmentApplyArgs) {
				output.append(1);
			},
		});

		const secondFragment = createHelper<
			TestContext,
			FragmentInput,
			FragmentOutput,
			Reporter,
			'fragment'
		>({
			key: 'fragment.beta',
			kind: 'fragment',
			dependsOn: ['fragment.alpha'],
			async apply({ output }: FragmentApplyArgs) {
				output.append(2);
			},
		});

		const builder = createHelper<
			TestContext,
			BuilderInput,
			BuilderOutput,
			Reporter,
			'builder'
		>({
			key: 'builder.core',
			kind: 'builder',
			async apply({ context }: BuilderApplyArgs) {
				context.logs.push('builder:core');
			},
		});

		pipeline.ir.use(firstFragment);
		pipeline.ir.use(secondFragment);
		pipeline.builders.use(builder);

		await pipeline.run({
			reporter,
			workspace: '/tmp/workspace',
			seed: 21,
		});

		expect(finalisationMetadata).toHaveLength(1);
		const [finaliseHelpers] = finalisationMetadata;
		expect(finaliseHelpers?.fragments.executed).toEqual([
			'fragment.alpha',
			'fragment.beta',
		]);
		expect(finaliseHelpers?.fragments.missing).toEqual([]);

		expect(runMetadata).toHaveLength(1);
		const [runHelpers] = runMetadata;
		expect(runHelpers?.fragments.executed).toEqual([
			'fragment.alpha',
			'fragment.beta',
		]);
		expect(runHelpers?.builders.executed).toEqual(['builder.core']);
		expect(runHelpers?.builders.missing).toEqual([]);
	});

	it('records diagnostics for missing dependencies', async () => {
		const reporter = createNoopReporter();
		const capturedDiagnostics: PipelineDiagnostic[] = [];
		const pipeline = createTestPipeline({
			createMissingDependencyDiagnostic({ helper, dependency, message }) {
				const diagnostic = {
					type: 'missing-dependency',
					key: helper.key,
					dependency,
					message,
				} satisfies PipelineDiagnostic;
				capturedDiagnostics.push(diagnostic);
				return diagnostic;
			},
			createUnusedHelperDiagnostic({ helper, message }) {
				const diagnostic = {
					type: 'unused-helper',
					key: helper.key,
					message,
				} satisfies PipelineDiagnostic;
				capturedDiagnostics.push(diagnostic);
				return diagnostic;
			},
		});

		const orphanFragment = createHelper<
			TestContext,
			FragmentInput,
			FragmentOutput,
			Reporter,
			'fragment'
		>({
			key: 'fragment.orphan',
			kind: 'fragment',
			dependsOn: ['fragment.missing'],
			async apply() {
				// no-op
			},
		});

		pipeline.ir.use(orphanFragment);

		await expect(
			pipeline.run({
				reporter,
				workspace: '/tmp/workspace',
				seed: 1,
			})
		).rejects.toThrow(KernelError);

		expect(capturedDiagnostics).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: 'missing-dependency',
					key: 'fragment.orphan',
					dependency: 'fragment.missing',
				}),
				expect.objectContaining({
					type: 'unused-helper',
					key: 'fragment.orphan',
				}),
			])
		);
	});

	it('records diagnostics for dependency cycles', async () => {
		const reporter = createNoopReporter();
		const capturedDiagnostics: PipelineDiagnostic[] = [];
		const pipeline = createTestPipeline({
			createUnusedHelperDiagnostic({ helper, message }) {
				const diagnostic = {
					type: 'unused-helper',
					key: helper.key,
					message,
				} satisfies PipelineDiagnostic;
				capturedDiagnostics.push(diagnostic);
				return diagnostic;
			},
		});

		const first = createHelper<
			TestContext,
			FragmentInput,
			FragmentOutput,
			Reporter,
			'fragment'
		>({
			key: 'fragment.first',
			kind: 'fragment',
			dependsOn: ['fragment.second'],
			async apply() {
				// no-op
			},
		});

		const second = createHelper<
			TestContext,
			FragmentInput,
			FragmentOutput,
			Reporter,
			'fragment'
		>({
			key: 'fragment.second',
			kind: 'fragment',
			dependsOn: ['fragment.first'],
			async apply() {
				// no-op
			},
		});

		pipeline.ir.use(first);
		pipeline.ir.use(second);

		await expect(
			pipeline.run({
				reporter,
				workspace: '/tmp/workspace',
				seed: 5,
			})
		).rejects.toThrow(KernelError);

		expect(capturedDiagnostics).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: 'unused-helper',
					key: 'fragment.first',
				}),
				expect.objectContaining({
					type: 'unused-helper',
					key: 'fragment.second',
				}),
			])
		);
		expect(
			capturedDiagnostics.every((diagnostic) =>
				diagnostic.message.includes('dependencies')
			)
		).toBe(true);
	});

	it('reports rollback failures with detailed metadata', async () => {
		const warn = jest.fn<void, [string, unknown?]>();
		const reporter = createMockReporter({ warn });
		const pipeline = createTestPipeline();

		const rollbackError = new KernelError('UnknownError', {
			message: 'rollback failed',
		});
		const rollbackCause = new Error('rollback cause');
		(rollbackError as Error & { cause?: unknown }).cause = rollbackCause;

		const extensionError = new KernelError('UnknownError', {
			message: 'extension failure',
		});

		registerFailingExtensionHooks(pipeline, rollbackError, extensionError);

		await expect(
			pipeline.run({
				reporter,
				workspace: '/tmp/workspace',
				seed: 9,
			})
		).rejects.toThrow(extensionError);

		expect(warn).toHaveBeenCalledTimes(1);
		const firstCall = warn.mock.calls[0]! as [string, unknown?];
		const message = firstCall[0];
		const context = firstCall[1];
		expect(message).toBe('Pipeline extension rollback failed.');
		expect(context).toMatchObject({
			error: rollbackError,
			errorName: rollbackError.name,
			errorMessage: rollbackError.message,
			extensions: ['extension.rollback', 'extension.failure'],
			hookKeys: ['extension.rollback', 'extension.failure'],
		});

		const contextObject = context as Record<string, unknown>;
		expect(contextObject.errorStack).toBe(rollbackError.stack);
		expect(contextObject.errorCause).toBe(rollbackCause);
	});

	it('provides rollback metadata to custom handlers', async () => {
		const reporter = createMockReporter();
		const handled: RecordedRollback[] = [];

		const pipeline = createTestPipeline({
			onExtensionRollbackError(options) {
				const { context: _context, ...rest } =
					options as RollbackHandlerOptions;
				handled.push(rest);
			},
		});

		const rollbackError = new KernelError('UnknownError', {
			message: 'rollback failed',
		});
		const rollbackCause = new Error('inner cause');
		(rollbackError as Error & { cause?: unknown }).cause = rollbackCause;

		const extensionError = new KernelError('UnknownError', {
			message: 'extension failure',
		});

		registerFailingExtensionHooks(pipeline, rollbackError, extensionError);

		await expect(
			pipeline.run({
				reporter,
				workspace: '/tmp/workspace',
				seed: 12,
			})
		).rejects.toThrow(extensionError);

		expect(handled).toHaveLength(1);
		const entry = handled[0]!;
		expect(entry.error).toBe(rollbackError);
		expect(entry.extensionKeys).toEqual([
			'extension.rollback',
			'extension.failure',
		]);
		expect(entry.hookSequence).toEqual([
			'extension.rollback',
			'extension.failure',
		]);
		expect(entry.errorMetadata).toMatchObject({
			name: rollbackError.name,
			message: rollbackError.message,
			stack: rollbackError.stack,
			cause: rollbackCause,
		});
	});
});
