/* eslint-disable import/no-extraneous-dependencies -- test fixtures rely on CLI runtime helpers */
import type { CreateHelperOptions } from '@wpkernel/core/pipeline';
import {
	createHelper,
	type BuilderHelper,
	type BuilderInput,
	type BuilderOutput,
	type FragmentHelper,
	type FragmentInput,
	type FragmentOutput,
	type PipelineContext,
	type PipelineExtension,
} from '@wpkernel/cli/next/runtime';

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
/* eslint-enable import/no-extraneous-dependencies */
