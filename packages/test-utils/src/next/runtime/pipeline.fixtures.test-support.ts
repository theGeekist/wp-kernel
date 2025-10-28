import type { CreateHelperOptions } from '@wpkernel/core/pipeline';
import {
	createHelper,
	type BuilderInput,
	type BuilderOutput,
	type FragmentInput,
	type FragmentOutput,
	type Pipeline,
	type PipelineContext,
} from '@wpkernel/cli/next/runtime';

type Reporter = PipelineContext['reporter'];

type FragmentHelper = Parameters<Pipeline['ir']['use']>[0];
type BuilderHelper = Parameters<Pipeline['builders']['use']>[0];
type PipelineExtension = Parameters<Pipeline['extensions']['use']>[0];

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
