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
