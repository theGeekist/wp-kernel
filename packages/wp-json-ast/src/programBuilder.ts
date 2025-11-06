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

/**
 * Options for creating a WordPress PHP program builder.
 *
 * @category WordPress AST
 * @example
 * ```ts
 * import { createWpPhpProgramBuilder } from '@wpkernel/wp-json-ast';
 *
 * const builder = createWpPhpProgramBuilder({
 * 	metadata: {
 * 		namespace: 'MyPlugin',
 * 		pluginName: 'my-plugin',
 * 		description: 'My plugin description.',
 * 	},
 * 	build: (builder) => {
 * 		builder.appendProgramStatement(
 * 			buildReturn(
 * 				buildScalarString('Hello from my plugin!')
 * 			)
 * 		);
 * 	}
 * });
 * ```
 */
export interface CreateWpPhpProgramBuilderOptions<
	TContext extends PipelineContext = PipelineContext,
	TInput extends BuilderInput = BuilderInput,
	TOutput extends BuilderOutput = BuilderOutput,
> extends Omit<
		BaseCreatePhpProgramBuilderOptions<TContext, TInput, TOutput>,
		'metadata' | 'build'
	> {
	/**
	 * Metadata for the WordPress PHP file.
	 *
	 * @see WpPhpFileMetadata
	 */
	readonly metadata: WpPhpFileMetadata;

	/**
	 * The build function that constructs the PHP AST.
	 *
	 * @param builder - The PHP AST builder adapter.
	 * @param entry   - The PHP AST context entry.
	 */
	readonly build: (
		builder: PhpAstBuilderAdapter,
		entry: PhpAstContextEntry
	) => Promise<void> | void;
}

/**
 * Creates a WordPress PHP program builder.
 *
 * This is a wrapper around the base PHP program builder that adds WordPress-specific features,
 * such as automatic generation of file headers and guards.
 *
 * @param    options.build
 * @param    options       - Options for creating the builder.
 * @returns A builder helper.
 * @category WordPress AST
 * @example
 * ```ts
 * import { createWpPhpProgramBuilder, buildReturn, buildScalarString } from '@wpkernel/wp-json-ast';
 *
 * const builder = createWpPhpProgramBuilder({
 * 	metadata: {
 * 		namespace: 'MyPlugin',
 * 		pluginName: 'my-plugin',
 * 		description: 'My plugin description.',
 * 	},
 * 	build: (builder) => {
 * 		builder.appendProgramStatement(
 * 			buildReturn(
 * 				buildScalarString('Hello from my plugin!')
 * 			)
 * 		);
 * 	}
 * });
 *
 * const result = await builder.apply(context, input);
 * console.log(result.output.files[0].contents);
 * ```
 */
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

/**
 * Options for creating a WordPress PHP file builder.
 *
 * @category WordPress AST
 * @deprecated Use `CreateWpPhpProgramBuilderOptions` instead.
 */
export type CreateWpPhpFileBuilderOptions<
	TContext extends PipelineContext = PipelineContext,
	TInput extends BuilderInput = BuilderInput,
	TOutput extends BuilderOutput = BuilderOutput,
> = CreateWpPhpProgramBuilderOptions<TContext, TInput, TOutput>;

/**
 * Creates a WordPress PHP file builder.
 *
 * This is a wrapper around the base PHP file builder that adds WordPress-specific features,
 * such as automatic generation of file headers and guards.
 *
 * @param      options - Options for creating the builder.
 * @returns A builder helper.
 * @category WordPress AST
 * @deprecated Use `createWpPhpProgramBuilder` instead.
 * @example
 * ```ts
 * import { createWpPhpFileBuilder, buildReturn, buildScalarString } from '@wpkernel/wp-json-ast';
 *
 * const builder = createWpPhpFileBuilder({
 * 	metadata: {
 * 		namespace: 'MyPlugin',
 * 		pluginName: 'my-plugin',
 * 		description: 'My plugin description.',
 * 	},
 * 	build: (builder) => {
 * 		builder.appendProgramStatement(
 * 			buildReturn(
 * 				buildScalarString('Hello from my plugin!')
 * 			)
 * 		);
 * 	}
 * });
 *
 * const result = await builder.apply(context, input);
 * console.log(result.output.files[0].contents);
 * ```
 */
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

/**
 * Wraps a build function with auto-guards.
 *
 * The guards are added as comments to the beginning and end of the program.
 *
 * @param build - The build function to wrap.
 * @returns The wrapped build function.
 * @internal
 */
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
