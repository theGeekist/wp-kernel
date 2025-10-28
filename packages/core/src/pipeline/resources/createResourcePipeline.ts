import { createPipeline } from '../createPipeline';
import type { PipelineDiagnostic } from '../types';
import type { Reporter } from '../../reporter/types';
import { buildResourceValidationFragment } from './helpers/buildResourceValidationFragment';
import { buildResourceClientFragment } from './helpers/buildResourceClientFragment';
import { buildResourceCacheKeysFragment } from './helpers/buildResourceCacheKeysFragment';
import { buildResourceObjectBuilder } from './helpers/buildResourceObjectBuilder';
import type {
	ResourceBuilderHelper,
	ResourceBuilderInput,
	ResourceFragmentHelper,
	ResourceFragmentInput,
	ResourcePipelineArtifact,
	ResourcePipelineBuildOptions,
	ResourcePipelineContext,
	ResourcePipelineDraft,
	ResourcePipelineRunOptions,
	ResourcePipelineRunResult,
} from './types';

export function createResourcePipeline<T, TQuery>() {
	const pipeline = createPipeline<
		ResourcePipelineRunOptions<T, TQuery>,
		ResourcePipelineBuildOptions<T, TQuery>,
		ResourcePipelineContext<T, TQuery>,
		Reporter,
		ResourcePipelineDraft<T, TQuery>,
		ResourcePipelineArtifact<T, TQuery>,
		PipelineDiagnostic,
		ResourcePipelineRunResult<T, TQuery>,
		ResourceFragmentInput<T, TQuery>,
		ResourcePipelineDraft<T, TQuery>,
		ResourceBuilderInput<T, TQuery>,
		ResourcePipelineArtifact<T, TQuery>,
		'core.resource.fragment',
		'core.resource.builder',
		ResourceFragmentHelper<T, TQuery>,
		ResourceBuilderHelper<T, TQuery>
	>({
		fragmentKind: 'core.resource.fragment',
		builderKind: 'core.resource.builder',
		createBuildOptions(runOptions) {
			return { ...runOptions } satisfies ResourcePipelineBuildOptions<
				T,
				TQuery
			>;
		},
		createContext(runOptions) {
			return {
				...runOptions,
				storeKey: `${runOptions.namespace}/${runOptions.resourceName}`,
			} satisfies ResourcePipelineContext<T, TQuery>;
		},
		createFragmentState() {
			return {} as ResourcePipelineDraft<T, TQuery>;
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
	});

	pipeline.ir.use(buildResourceValidationFragment<T, TQuery>());
	pipeline.ir.use(buildResourceClientFragment<T, TQuery>());
	pipeline.ir.use(buildResourceCacheKeysFragment<T, TQuery>());
	pipeline.builders.use(buildResourceObjectBuilder<T, TQuery>());

	return pipeline;
}
