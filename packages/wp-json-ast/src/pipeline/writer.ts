import type {
	BuilderHelper,
	BuilderInput,
	BuilderOutput,
	CreatePhpProgramWriterHelperOptions,
	PipelineContext,
	PhpBuilderChannel,
	PhpFileMetadata,
	PhpProgram,
} from '@wpkernel/php-json-ast';
import { createPhpProgramWriterHelper as createBasePhpProgramWriterHelper } from '@wpkernel/php-json-ast';

export type { CreatePhpProgramWriterHelperOptions } from '@wpkernel/php-json-ast';

export interface ProgramTargetFile<
	TMetadata extends PhpFileMetadata = PhpFileMetadata,
> {
	readonly fileName: string;
	readonly program: PhpProgram;
	readonly metadata: TMetadata;
	readonly docblock?: readonly string[];
	readonly uses?: readonly string[];
	readonly statements?: readonly string[];
}

export interface QueueProgramFileOptions {
	readonly docblockPrefix?: readonly string[];
	readonly filePath?: string;
}

export interface QueueModuleFilesOptions<
	TFile extends ProgramTargetFile = ProgramTargetFile,
> {
	readonly files: readonly TFile[];
	readonly docblockPrefix?: readonly string[];
	readonly filter?: (file: TFile) => boolean;
}

type ProgramTargetQueue<TFile extends ProgramTargetFile = ProgramTargetFile> = (
	file: TFile,
	overrides?: QueueProgramFileOptions
) => void;

type ProgramTargetQueueMany<
	TFile extends ProgramTargetFile = ProgramTargetFile,
> = (options: QueueModuleFilesOptions<TFile>) => void;

export interface ResolveFilePathStrategyContext<
	TFile extends ProgramTargetFile = ProgramTargetFile,
> {
	readonly workspace: PipelineContext['workspace'];
	readonly outputDir: string;
	readonly file: TFile;
	readonly overrides?: QueueProgramFileOptions;
}

export type ProgramTargetPlannerStrategy<
	TFile extends ProgramTargetFile = ProgramTargetFile,
> = {
	readonly resolveFilePath?: (
		context: ResolveFilePathStrategyContext<TFile>
	) => string;
};

export type ProgramTargetPlannerOptions<
	TFile extends ProgramTargetFile = ProgramTargetFile,
> = {
	readonly workspace: PipelineContext['workspace'];
	readonly outputDir: string;
	readonly channel: PhpBuilderChannel;
	readonly docblockPrefix?: readonly string[];
	readonly strategy?: ProgramTargetPlannerStrategy<TFile>;
};

export interface ProgramTargetPlanner<
	TFile extends ProgramTargetFile = ProgramTargetFile,
> {
	readonly queueFile: ProgramTargetQueue<TFile>;
	readonly queueFiles: ProgramTargetQueueMany<TFile>;
}

export function buildProgramTargetPlanner(
	options: ProgramTargetPlannerOptions
): ProgramTargetPlanner;
export function buildProgramTargetPlanner<
	TFile extends ProgramTargetFile = ProgramTargetFile,
>(options: ProgramTargetPlannerOptions<TFile>): ProgramTargetPlanner<TFile> {
	const { workspace, outputDir, channel } = options;
	const baseDocblockPrefix = options.docblockPrefix ?? [];
	const strategy = options.strategy ?? {};

	const resolveFilePath =
		strategy.resolveFilePath ??
		((context: ResolveFilePathStrategyContext<TFile>) =>
			resolveProgramFilePath(
				context.workspace,
				context.outputDir,
				context.file.fileName
			));

	const queueFile: ProgramTargetQueue<TFile> = (file, overrides) => {
		const resolvedPath = overrides?.filePath
			? overrides.filePath
			: resolveFilePath({
					workspace,
					outputDir,
					file,
					overrides,
				});

		const docblock = mergeDocblockSegments(
			baseDocblockPrefix,
			overrides?.docblockPrefix,
			file.docblock
		);

		channel.queue({
			file: resolvedPath,
			program: file.program,
			metadata: file.metadata,
			docblock,
			uses: file.uses ?? [],
			statements: file.statements ?? [],
		});
	};

	const queueFiles: ProgramTargetQueueMany<TFile> = ({
		files,
		docblockPrefix,
		filter,
	}) => {
		for (const file of files) {
			if (filter?.(file) === false) {
				continue;
			}

			queueFile(file, { docblockPrefix });
		}
	};

	return { queueFile, queueFiles };
}

export function createPhpProgramWriterHelper<
	TContext extends PipelineContext = PipelineContext,
	TInput extends BuilderInput = BuilderInput,
	TOutput extends BuilderOutput = BuilderOutput,
>(
	options: CreatePhpProgramWriterHelperOptions = {}
): BuilderHelper<TContext, TInput, TOutput> {
	return createBasePhpProgramWriterHelper<TContext, TInput, TOutput>(options);
}

function resolveProgramFilePath(
	workspace: PipelineContext['workspace'],
	outputDir: string,
	fileName: string
): string {
	const normalised = fileName.replace(/\\/g, '/');
	const segments = normalised
		.split('/')
		.filter((segment) => segment.length > 0);

	return workspace.resolve(outputDir, ...segments);
}

function mergeDocblockSegments(
	...segments: ReadonlyArray<readonly string[] | undefined>
): readonly string[] {
	const result: string[] = [];

	for (const segment of segments) {
		if (!segment) {
			continue;
		}

		result.push(...segment);
	}

	return result;
}
