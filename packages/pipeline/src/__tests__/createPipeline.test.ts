import { createHelper } from '../helper.js';
import { createPipeline } from '../createPipeline.js';
import type {
	HelperApplyOptions,
	Pipeline,
	PipelineDiagnostic,
	PipelineReporter,
	PipelineRunState,
} from '../types.js';

type TestRunOptions = Record<string, never>;
type TestBuildOptions = Record<string, never>;
type TestDiagnostic = PipelineDiagnostic;
type TestReporter = Required<PipelineReporter> & {
	readonly info: jest.Mock;
	readonly child: jest.Mock<TestReporter, []>;
};
type TestContext = { readonly reporter: TestReporter };
type TestDraft = string[];
type TestArtifact = string[];
type TestRunResult = PipelineRunState<TestArtifact, TestDiagnostic>;
type TestPipeline = Pipeline<
	TestRunOptions,
	TestRunResult,
	TestContext,
	TestReporter,
	TestBuildOptions,
	TestArtifact,
	void,
	string[],
	void,
	string[],
	TestDiagnostic
>;

function createTestReporter(): TestReporter {
	const reporter = {
		warn: jest.fn(),
		info: jest.fn(),
		child: jest.fn(),
	} as unknown as TestReporter;

	reporter.child.mockReturnValue(reporter);

	return reporter;
}

function createTestPipeline(): {
	pipeline: TestPipeline;
	reporter: TestReporter;
} {
	const reporter = createTestReporter();

	const pipeline = createPipeline<
		TestRunOptions,
		TestBuildOptions,
		TestContext,
		TestReporter,
		TestDraft,
		TestArtifact,
		TestDiagnostic,
		TestRunResult,
		void,
		string[],
		void,
		string[]
	>({
		createError(code, message) {
			throw new Error(`[${code}] ${message}`);
		},
		createBuildOptions() {
			return {};
		},
		createContext() {
			return { reporter } satisfies TestContext;
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
				TestReporter
			>;
		},
		finalizeFragmentState({ draft }) {
			return draft.slice();
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
				TestReporter
			>;
		},
		createRunResult({ artifact, diagnostics, steps }) {
			return { artifact, diagnostics, steps } satisfies TestRunResult;
		},
	});

	pipeline.ir.use(
		createHelper<
			TestContext,
			void,
			string[],
			TestReporter,
			typeof pipeline.fragmentKind
		>({
			key: 'fragment.core',
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
			TestReporter,
			typeof pipeline.builderKind
		>({
			key: 'builder.core',
			kind: pipeline.builderKind,
			priority: 0,
			apply({ output }) {
				output.push('builder');
			},
		})
	);

	return { pipeline, reporter };
}

describe('createPipeline (extensions)', () => {
	it('waits for async extension registration even when extensions.use() is not awaited', async () => {
		const { pipeline } = createTestPipeline();
		const hook = jest.fn(({ artifact }: { artifact: string[] }) => ({
			artifact: [...artifact, 'extension-hook'],
		}));

		pipeline.extensions.use({
			key: 'test.async-extension',
			async register() {
				await Promise.resolve();
				return hook;
			},
		});

		const result = await pipeline.run({});

		expect(result.artifact).toEqual([
			'fragment',
			'extension-hook',
			'builder',
		]);
		expect(hook).toHaveBeenCalledTimes(1);
	});

	it('propagates async registration failures to pipeline.run()', async () => {
		const { pipeline } = createTestPipeline();
		pipeline.extensions.use({
			key: 'test.async-failure',
			async register() {
				await Promise.resolve();
				throw new Error('registration failed');
			},
		});

		await expect(pipeline.run({})).rejects.toThrow('registration failed');
	});
});
