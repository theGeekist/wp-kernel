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

export interface ProgramTargetPlannerOptions {
	readonly workspace: PipelineContext['workspace'];
	readonly outputDir: string;
	readonly channel: PhpBuilderChannel;
	readonly docblockPrefix?: readonly string[];
}

export interface ProgramTargetPlanner {
	readonly queueFile: ProgramTargetQueue;
	readonly queueFiles: ProgramTargetQueueMany;
}

export function buildProgramTargetPlanner(
	options: ProgramTargetPlannerOptions
): ProgramTargetPlanner {
	const { workspace, outputDir, channel } = options;
	const baseDocblockPrefix = options.docblockPrefix ?? [];

	const queueFile: ProgramTargetQueue = (file, overrides) => {
		const resolvedPath = overrides?.filePath
			? overrides.filePath
			: resolveProgramFilePath(workspace, outputDir, file.fileName);

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

	const queueFiles: ProgramTargetQueueMany = ({
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
