import {
	createHelper,
	resetPhpAstChannel,
	resetPhpBuilderChannel,
	type BuilderHelper,
	type BuilderInput,
	type BuilderOutput,
	type PipelineContext,
} from '@wpkernel/php-json-ast';

export {
	getPhpBuilderChannel,
	resetPhpBuilderChannel,
	resetPhpAstChannel,
} from '@wpkernel/php-json-ast';
/**
 * @category WordPress AST
 */
export type {
	PhpBuilderChannel,
	PhpProgramAction,
} from '@wpkernel/php-json-ast';

/**
 * @category WordPress AST
 */
export interface PhpChannelHelperOptions {
	readonly key?: string;
}

/**
 * @category WordPress AST
 */
export interface PhpChannelHelpers<
	TContext extends PipelineContext = PipelineContext,
	TInput extends BuilderInput = BuilderInput,
	TOutput extends BuilderOutput = BuilderOutput,
> {
	readonly channel: BuilderHelper<TContext, TInput, TOutput>;
}

/**
 * @param    options
 * @category WordPress AST
 */
export function buildPhpChannelHelpers<
	TContext extends PipelineContext = PipelineContext,
	TInput extends BuilderInput = BuilderInput,
	TOutput extends BuilderOutput = BuilderOutput,
>(
	options: PhpChannelHelperOptions = {}
): PhpChannelHelpers<TContext, TInput, TOutput> {
	return {
		channel: createPhpChannelHelper<TContext, TInput, TOutput>(options),
	};
}

/**
 * @param    options
 * @category WordPress AST
 */
export function createPhpChannelHelper<
	TContext extends PipelineContext = PipelineContext,
	TInput extends BuilderInput = BuilderInput,
	TOutput extends BuilderOutput = BuilderOutput,
>(
	options: PhpChannelHelperOptions = {}
): BuilderHelper<TContext, TInput, TOutput> {
	return createHelper<
		TContext,
		TInput,
		TOutput,
		PipelineContext['reporter'],
		'builder'
	>({
		key: options.key ?? 'builder.generate.php.channel.bootstrap',
		kind: 'builder',
		async apply(helperOptions, next) {
			resetPhpBuilderChannel(helperOptions.context);
			resetPhpAstChannel(helperOptions.context);
			helperOptions.reporter.debug(
				'createPhpChannelHelper: channels reset for PHP pipeline.'
			);

			await next?.();
		},
	});
}
