import type { CreateHelperOptions } from '@wpkernel/core/pipeline';
import { createHelper } from '../createHelper';
import type {
	BuilderHelper,
	BuilderInput,
	BuilderOutput,
	FragmentHelper,
	FragmentInput,
	FragmentOutput,
	PipelineContext,
	PipelineExtension,
} from '../types';

type Reporter = PipelineContext['reporter'];

type FragmentHelperOptions = Omit<
	CreateHelperOptions<
		PipelineContext,
		FragmentInput,
		FragmentOutput,
		Reporter,
		FragmentHelper['kind']
	>,
	'kind'
>;

type BuilderHelperOptions = Omit<
	CreateHelperOptions<
		PipelineContext,
		BuilderInput,
		BuilderOutput,
		Reporter,
		BuilderHelper['kind']
	>,
	'kind'
>;

interface BuildPipelineExtensionOptions {
	readonly key?: string;
	readonly register?: PipelineExtension['register'];
}

export function buildFragmentHelper(
	options: FragmentHelperOptions
): FragmentHelper {
	return createHelper({
		...options,
		kind: 'fragment',
	});
}

export function buildBuilderHelper(
	options: BuilderHelperOptions
): BuilderHelper {
	return createHelper({
		...options,
		kind: 'builder',
	});
}

export function buildPipelineExtension({
	key,
	register,
}: BuildPipelineExtensionOptions = {}): PipelineExtension {
	return {
		key,
		register:
			register ??
			((): ReturnType<PipelineExtension['register']> => undefined),
	} satisfies PipelineExtension;
}
