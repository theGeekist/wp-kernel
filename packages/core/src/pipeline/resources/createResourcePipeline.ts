import { createPipeline } from '../createPipeline';
import { buildResourceValidationFragment } from './helpers/buildResourceValidationFragment';
import { buildResourceClientFragment } from './helpers/buildResourceClientFragment';
import { buildResourceCacheKeysFragment } from './helpers/buildResourceCacheKeysFragment';
import { buildResourceObjectBuilder } from './helpers/buildResourceObjectBuilder';
import type {
	ResourcePipeline,
	ResourcePipelineOptions,
	ResourcePipelineRunResult,
} from './types';
import { RESOURCE_BUILDER_KIND, RESOURCE_FRAGMENT_KIND } from './types';

export function createResourcePipeline<T, TQuery>(): ResourcePipeline<
	T,
	TQuery
> {
	const pipelineOptions = {
		fragmentKind: RESOURCE_FRAGMENT_KIND,
		builderKind: RESOURCE_BUILDER_KIND,
		createBuildOptions(runOptions) {
			return { ...runOptions };
		},
		createContext(runOptions) {
			return {
				...runOptions,
				storeKey: `${runOptions.namespace}/${runOptions.resourceName}`,
			};
		},
		createFragmentState() {
			return {};
		},
		createFragmentArgs({ options, context, draft }) {
			return {
				context,
				input: options.config,
				output: draft,
				reporter: context.reporter,
			};
		},
		finalizeFragmentState({ draft }) {
			return draft;
		},
		createBuilderArgs({ options, context, artifact }) {
			return {
				context,
				input: options.config,
				output: artifact,
				reporter: context.reporter,
			};
		},
		createRunResult({ artifact, diagnostics, steps }) {
			return {
				artifact,
				diagnostics,
				steps,
			} satisfies ResourcePipelineRunResult<T, TQuery>;
		},
	} satisfies ResourcePipelineOptions<T, TQuery>;

	const pipeline: ResourcePipeline<T, TQuery> =
		createPipeline(pipelineOptions);

	pipeline.ir.use(buildResourceValidationFragment<T, TQuery>());
	pipeline.ir.use(buildResourceClientFragment<T, TQuery>());
	pipeline.ir.use(buildResourceCacheKeysFragment<T, TQuery>());
	pipeline.builders.use(buildResourceObjectBuilder<T, TQuery>());

	return pipeline;
}
