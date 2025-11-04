import type { CreateHelperOptions } from '@wpkernel/core/pipeline';
import { createHelper as createCoreHelper } from '@wpkernel/core/pipeline';
import type {
	BuilderHelper,
	BuilderInput,
	BuilderOutput,
	FragmentHelper,
	FragmentInput,
	FragmentOutput,
	PipelineContext,
} from './types';

type CliReporter = PipelineContext['reporter'];

type FragmentHelperOptions = CreateHelperOptions<
	PipelineContext,
	FragmentInput,
	FragmentOutput,
	CliReporter,
	FragmentHelper['kind']
>;

type BuilderHelperOptions = CreateHelperOptions<
	PipelineContext,
	BuilderInput,
	BuilderOutput,
	CliReporter,
	BuilderHelper['kind']
>;

/**
 * Creates a pipeline helper for use within the CLI's code generation pipeline.
 *
 * This function acts as a wrapper around the core `createHelper` from `@wpkernel/core/pipeline`,
 * providing type-safe definitions for CLI-specific fragment and builder helpers.
 * Helpers are reusable units of logic that can transform input into output within the pipeline.
 *
 * @category Pipeline
 * @param    options - Configuration options for the helper, including its kind, handler, and metadata.
 * @returns A `FragmentHelper` or `BuilderHelper` instance, depending on the provided options.
 */
export function createHelper(options: FragmentHelperOptions): FragmentHelper;
export function createHelper(options: BuilderHelperOptions): BuilderHelper;
export function createHelper(
	options: FragmentHelperOptions | BuilderHelperOptions
): FragmentHelper | BuilderHelper {
	return createCoreHelper(
		options as CreateHelperOptions<
			PipelineContext,
			FragmentInput | BuilderInput,
			FragmentOutput | BuilderOutput,
			CliReporter,
			FragmentHelper['kind'] | BuilderHelper['kind']
		>
	) as FragmentHelper | BuilderHelper;
}
