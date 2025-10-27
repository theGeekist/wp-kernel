import {
	createPhpProgramBuilder as createBasePhpProgramBuilder,
	createPhpFileBuilder as createBasePhpFileBuilder,
	buildComment,
	buildStmtNop,
	type BuilderHelper,
	type BuilderInput,
	type BuilderOutput,
	type CreatePhpProgramBuilderOptions as BaseCreatePhpProgramBuilderOptions,
	type PhpAstBuilderAdapter,
	type PhpAstContextEntry,
	type PipelineContext,
} from '@wpkernel/php-json-ast';

import { AUTO_GUARD_BEGIN, AUTO_GUARD_END } from './constants';
import type { WpPhpFileMetadata } from './types';

export interface CreateWpPhpProgramBuilderOptions<
	TContext extends PipelineContext = PipelineContext,
	TInput extends BuilderInput = BuilderInput,
	TOutput extends BuilderOutput = BuilderOutput,
> extends Omit<
		BaseCreatePhpProgramBuilderOptions<TContext, TInput, TOutput>,
		'metadata' | 'build'
	> {
	readonly metadata: WpPhpFileMetadata;
	readonly build: (
		builder: PhpAstBuilderAdapter,
		entry: PhpAstContextEntry
	) => Promise<void> | void;
}

export function createWpPhpProgramBuilder<
	TContext extends PipelineContext = PipelineContext,
	TInput extends BuilderInput = BuilderInput,
	TOutput extends BuilderOutput = BuilderOutput,
>({
	build,
	...options
}: CreateWpPhpProgramBuilderOptions<TContext, TInput, TOutput>): BuilderHelper<
	TContext,
	TInput,
	TOutput
> {
	return createBasePhpProgramBuilder({
		...options,
		build: wrapWithAutoGuards(build),
	});
}

export type CreateWpPhpFileBuilderOptions<
	TContext extends PipelineContext = PipelineContext,
	TInput extends BuilderInput = BuilderInput,
	TOutput extends BuilderOutput = BuilderOutput,
> = CreateWpPhpProgramBuilderOptions<TContext, TInput, TOutput>;

export function createWpPhpFileBuilder<
	TContext extends PipelineContext = PipelineContext,
	TInput extends BuilderInput = BuilderInput,
	TOutput extends BuilderOutput = BuilderOutput,
>(
	options: CreateWpPhpFileBuilderOptions<TContext, TInput, TOutput>
): BuilderHelper<TContext, TInput, TOutput> {
	return createBasePhpFileBuilder({
		...options,
		build: wrapWithAutoGuards(options.build),
	});
}

function wrapWithAutoGuards(
	build: (
		builder: PhpAstBuilderAdapter,
		entry: PhpAstContextEntry
	) => Promise<void> | void
): (
	builder: PhpAstBuilderAdapter,
	entry: PhpAstContextEntry
) => Promise<void> | void {
	return async (builder, entry) => {
		entry.context.pendingStatementLines.push(`// ${AUTO_GUARD_BEGIN}`);
		builder.appendProgramStatement(
			buildStmtNop({
				comments: [buildComment(`// ${AUTO_GUARD_BEGIN}`)],
			})
		);

		await build(builder, entry);

		entry.context.pendingStatementLines.push(`// ${AUTO_GUARD_END}`);
		builder.appendProgramStatement(
			buildStmtNop({
				comments: [buildComment(`// ${AUTO_GUARD_END}`)],
			})
		);
	};
}
