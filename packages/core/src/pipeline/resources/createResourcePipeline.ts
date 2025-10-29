import { createPipeline } from '../createPipeline';
import { buildResourceValidationFragment } from './helpers/buildResourceValidationFragment';
import { buildResourceClientFragment } from './helpers/buildResourceClientFragment';
import { buildResourceCacheKeysFragment } from './helpers/buildResourceCacheKeysFragment';
import { buildResourceObjectBuilder } from './helpers/buildResourceObjectBuilder';
import { buildResourceNamespaceFragment } from './helpers/buildResourceNamespaceFragment';
import { buildResourceReporterFragment } from './helpers/buildResourceReporterFragment';
import { buildResourceGroupedApiBuilder } from './helpers/buildResourceGroupedApiBuilder';
import { buildResourceRegistryRecorder } from './helpers/buildResourceRegistryRecorder';
import type {
	ResourcePipeline,
	ResourcePipelineOptions,
	ResourcePipelineRunResult,
} from './types';
import { RESOURCE_BUILDER_KIND, RESOURCE_FRAGMENT_KIND } from './types';
import { createNoopReporter } from '../../reporter';
import { buildPipelineCommit, buildPipelineRollback } from '../helpers/commit';

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
				config: runOptions.config,
				registry: runOptions.registry,
				namespace: '',
				resourceName: '',
				reporter: createNoopReporter(),
				storeKey: '',
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

	pipeline.ir.use(buildResourceNamespaceFragment<T, TQuery>());
	pipeline.ir.use(buildResourceReporterFragment<T, TQuery>());
	pipeline.ir.use(buildResourceValidationFragment<T, TQuery>());
	pipeline.ir.use(buildResourceClientFragment<T, TQuery>());
	pipeline.ir.use(buildResourceCacheKeysFragment<T, TQuery>());
	pipeline.builders.use(buildResourceGroupedApiBuilder<T, TQuery>());
	pipeline.builders.use(buildResourceObjectBuilder<T, TQuery>());
	pipeline.builders.use(buildResourceRegistryRecorder<T, TQuery>());

	pipeline.extensions.use({
		key: 'core.resource.side-effects',
		register:
			() =>
			({ artifact }) => {
				const runCommit = () => {
					const sideEffects = artifact.sideEffects;
					if (!sideEffects) {
						return;
					}

					const commit = buildPipelineCommit(...sideEffects.commits);
					if (!commit) {
						return;
					}

					return commit();
				};

				const runRollback = () => {
					const sideEffects = artifact.sideEffects;
					if (!sideEffects) {
						return;
					}

					const rollback = buildPipelineRollback(
						...sideEffects.rollbacks
					);
					if (!rollback) {
						return;
					}

					return rollback();
				};

				return {
					commit: runCommit,
					rollback: runRollback,
				};
			},
	});

	return pipeline;
}
