import { createPipeline } from '../createPipeline';
import { createHelper } from '../helper';
import { WPKernelError } from '../../error';
import type { Reporter } from '../../reporter/types';
import type {
	HelperApplyOptions,
	Pipeline,
	PipelineDiagnostic,
	PipelineRunState,
	PipelineExtensionHookResult,
} from '../types';

describe('createPipeline.runSync', () => {
	function createTestReporter(): Reporter {
		const reporter: Reporter = {
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
			child: jest.fn(),
		} as Reporter;

		(reporter.child as jest.Mock).mockReturnValue(reporter);

		return reporter;
	}

	type TestRunOptions = Record<string, never>;
	type TestBuildOptions = Record<string, never>;
	type TestContext = { reporter: Reporter };
	type TestDraft = string[];
	type TestArtifact = string[];
	type TestDiagnostic = PipelineDiagnostic;
	type TestRunResult = PipelineRunState<TestArtifact, TestDiagnostic>;

	type TestPipeline = Pipeline<
		TestRunOptions,
		TestRunResult,
		TestContext,
		Reporter,
		TestBuildOptions,
		TestArtifact,
		void,
		string[],
		void,
		string[],
		TestDiagnostic
	>;

	function createTestPipeline(): TestPipeline {
		const reporter = createTestReporter();
		const pipeline = createPipeline<
			TestRunOptions,
			TestBuildOptions,
			TestContext,
			Reporter,
			TestDraft,
			TestArtifact,
			TestDiagnostic,
			TestRunResult,
			void,
			string[],
			void,
			string[]
		>({
			createBuildOptions() {
				return {};
			},
			createContext() {
				return { reporter };
			},
			createFragmentState() {
				return [] as TestDraft;
			},
			createFragmentArgs({ context, draft }) {
				return {
					context,
					input: undefined,
					output: draft,
					reporter: context.reporter,
				} satisfies HelperApplyOptions<
					TestContext,
					void,
					string[],
					Reporter
				>;
			},
			finalizeFragmentState({ draft }) {
				return draft;
			},
			createBuilderArgs({ context, artifact }) {
				return {
					context,
					input: undefined,
					output: artifact,
					reporter: context.reporter,
				} satisfies HelperApplyOptions<
					TestContext,
					void,
					string[],
					Reporter
				>;
			},
			createRunResult({ artifact, diagnostics, steps }) {
				return { artifact, diagnostics, steps } satisfies TestRunResult;
			},
		});

		return pipeline;
	}

	it('executes helpers synchronously', () => {
		const pipeline = createTestPipeline();

		pipeline.ir.use(
			createHelper<
				TestContext,
				void,
				string[],
				Reporter,
				typeof pipeline.fragmentKind
			>({
				key: 'fragment.one',
				kind: pipeline.fragmentKind,
				apply({ output }) {
					output.push('fragment');
				},
			})
		);

		pipeline.builders.use(
			createHelper<
				TestContext,
				void,
				string[],
				Reporter,
				typeof pipeline.builderKind
			>({
				key: 'builder.one',
				kind: pipeline.builderKind,
				apply({ output }) {
					output.push('builder');
				},
			})
		);

		const result = pipeline.runSync({});

		expect(result.artifact).toEqual(['fragment', 'builder']);
		expect(result.diagnostics).toHaveLength(0);
		expect(result.steps.map((step) => step.key)).toEqual<readonly string[]>(
			['fragment.one', 'builder.one']
		);
	});

	it('throws when a helper returns a Promise', () => {
		const pipeline = createTestPipeline();

		pipeline.ir.use(
			createHelper<
				TestContext,
				void,
				string[],
				Reporter,
				typeof pipeline.fragmentKind
			>({
				key: 'fragment.async',
				kind: pipeline.fragmentKind,
				async apply() {
					return Promise.resolve();
				},
			})
		);

		expect.assertions(2);

		try {
			pipeline.runSync({});
		} catch (error) {
			expect(error).toBeInstanceOf(WPKernelError);
			expect((error as Error).message).toContain(
				'returned a Promise during synchronous pipeline execution'
			);
		}
	});

	it('throws when an extension hook returns a Promise', () => {
		const pipeline = createTestPipeline();

		pipeline.ir.use(
			createHelper<
				TestContext,
				void,
				string[],
				Reporter,
				typeof pipeline.fragmentKind
			>({
				key: 'fragment.one',
				kind: pipeline.fragmentKind,
				apply({ output }) {
					output.push('fragment');
				},
			})
		);

		pipeline.builders.use(
			createHelper<
				TestContext,
				void,
				string[],
				Reporter,
				typeof pipeline.builderKind
			>({
				key: 'builder.one',
				kind: pipeline.builderKind,
				apply({ output }) {
					output.push('builder');
				},
			})
		);

		pipeline.extensions.use({
			key: 'extension.async',
			register() {
				return () => Promise.resolve();
			},
		});

		expect.assertions(2);

		try {
			pipeline.runSync({});
		} catch (error) {
			expect(error).toBeInstanceOf(WPKernelError);
			expect((error as Error).message).toContain(
				'Extension hook "extension.async" returned a Promise during synchronous pipeline execution.'
			);
		}
	});

	it('throws when an extension commit returns a Promise', () => {
		const pipeline = createTestPipeline();

		pipeline.ir.use(
			createHelper<
				TestContext,
				void,
				string[],
				Reporter,
				typeof pipeline.fragmentKind
			>({
				key: 'fragment.one',
				kind: pipeline.fragmentKind,
				apply({ output }) {
					output.push('fragment');
				},
			})
		);

		pipeline.builders.use(
			createHelper<
				TestContext,
				void,
				string[],
				Reporter,
				typeof pipeline.builderKind
			>({
				key: 'builder.one',
				kind: pipeline.builderKind,
				apply({ output }) {
					output.push('builder');
				},
			})
		);

		pipeline.extensions.use({
			key: 'extension.commit',
			register() {
				return () =>
					({
						commit: () => Promise.resolve(),
					}) satisfies PipelineExtensionHookResult<TestArtifact>;
			},
		});

		expect.assertions(2);

		try {
			pipeline.runSync({});
		} catch (error) {
			expect(error).toBeInstanceOf(WPKernelError);
			expect((error as Error).message).toContain(
				'Extension hook "extension.commit" commit handler returned a Promise during synchronous pipeline execution.'
			);
		}
	});
});
