import { createPipeline } from '../createPipeline';
import { reportPipelineDiagnostic } from '../reporting';
import { createResourceValidationFragment } from './helpers/createResourceValidationFragment';
import { createResourceClientFragment } from './helpers/createResourceClientFragment';
import { createResourceCacheKeysFragment } from './helpers/createResourceCacheKeysFragment';
import { createResourceObjectBuilder } from './helpers/createResourceObjectBuilder';
import { createFinalizeResourceDefinitionExtension } from './extensions/createFinalizeResourceDefinitionExtension';
import type {
	ResourcePipeline,
	ResourcePipelineOptions,
	ResourcePipelineRunResult,
} from './types';
import { RESOURCE_BUILDER_KIND, RESOURCE_FRAGMENT_KIND } from './types';

/**
 * Construct the resource pipeline responsible for validating configuration,
 * producing cache keys, creating clients, and building the final resource
 * object.
 *
 * @example
 * ```ts
 * const pipeline = createResourcePipeline<Post, { id: number }>();
 * const result = await pipeline.run({
 *   config: resourceConfig,
 *   normalizedConfig,
 *   namespace: 'example/resources',
 *   resourceName: 'Post',
 *   reporter,
 * });
 *
 * console.log(result.artifact.resource?.get.one({ id: 42 }));
 * ```
 */
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
		onDiagnostic({ reporter, diagnostic }) {
			reportPipelineDiagnostic({ reporter, diagnostic });
		},
	} satisfies ResourcePipelineOptions<T, TQuery>;

	const pipeline: ResourcePipeline<T, TQuery> =
		createPipeline(pipelineOptions);

	pipeline.ir.use(createResourceValidationFragment<T, TQuery>());
	pipeline.ir.use(createResourceClientFragment<T, TQuery>());
	pipeline.ir.use(createResourceCacheKeysFragment<T, TQuery>());
	pipeline.builders.use(createResourceObjectBuilder<T, TQuery>());
	pipeline.extensions.use(
		createFinalizeResourceDefinitionExtension<T, TQuery>()
	);

	return pipeline;
}
