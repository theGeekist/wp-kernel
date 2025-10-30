export type StageResult<Output> = Output | Promise<Output>;

export interface PipelineContext<Shared> {
	readonly shared: Shared;
}

export interface PipelineStage<Input, Output, Shared = void> {
	readonly name: string;
	readonly run: (
		input: Input,
		context: PipelineContext<Shared>
	) => StageResult<Output>;
}

export interface Pipeline<InitialInput, FinalOutput, Shared = void> {
	readonly stages: readonly PipelineStage<unknown, unknown, Shared>[];
	run: (input: InitialInput, shared: Shared) => Promise<FinalOutput>;
}

class DefaultPipeline<InitialInput, FinalOutput, Shared>
	implements Pipeline<InitialInput, FinalOutput, Shared>
{
	public constructor(
		public readonly stages: readonly PipelineStage<
			unknown,
			unknown,
			Shared
		>[],
		private readonly runner: (
			input: InitialInput,
			shared: Shared
		) => Promise<FinalOutput>
	) {}

	public async run(
		input: InitialInput,
		shared: Shared
	): Promise<FinalOutput> {
		return this.runner(input, shared);
	}
}

export class PipelineBuilder<InitialInput, CurrentOutput, Shared = void> {
	private constructor(
		private readonly stages: readonly PipelineStage<
			unknown,
			unknown,
			Shared
		>[],
		private readonly executor: (
			input: InitialInput,
			shared: Shared
		) => Promise<CurrentOutput>
	) {}

	public static start<InitialInput, FirstOutput, Shared = void>(
		stage: PipelineStage<InitialInput, FirstOutput, Shared>
	): PipelineBuilder<InitialInput, FirstOutput, Shared> {
		const stages: PipelineStage<unknown, unknown, Shared>[] = [
			stage as PipelineStage<unknown, unknown, Shared>,
		];
		const executor = async (
			input: InitialInput,
			shared: Shared
		): Promise<FirstOutput> => {
			const context: PipelineContext<Shared> = { shared };
			return stage.run(input, context);
		};

		return new PipelineBuilder(stages, executor);
	}

	public addStage<NextOutput>(
		stage: PipelineStage<CurrentOutput, NextOutput, Shared>
	): PipelineBuilder<InitialInput, NextOutput, Shared> {
		const stages: PipelineStage<unknown, unknown, Shared>[] = [
			...this.stages,
			stage as PipelineStage<unknown, unknown, Shared>,
		];
		const executor = async (
			input: InitialInput,
			shared: Shared
		): Promise<NextOutput> => {
			const context: PipelineContext<Shared> = { shared };
			const current = await this.executor(input, shared);
			return stage.run(current, context);
		};

		return new PipelineBuilder(stages, executor);
	}

	public build(): Pipeline<InitialInput, CurrentOutput, Shared> {
		return new DefaultPipeline(this.stages, this.executor);
	}
}

export function createPipeline<InitialInput, FirstOutput, Shared = void>(
	stage: PipelineStage<InitialInput, FirstOutput, Shared>
): PipelineBuilder<InitialInput, FirstOutput, Shared> {
	return PipelineBuilder.start(stage);
}
