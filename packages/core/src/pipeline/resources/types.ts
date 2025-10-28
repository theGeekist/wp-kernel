import type { Reporter } from '../../reporter/types';
import type {
	CacheKeys,
	ResourceClient,
	ResourceConfig,
	ResourceObject,
} from '../../resource/types';
import type { NormalizedResourceConfig } from '../../resource/buildResourceObject';
import type {
	CreatePipelineOptions,
	Helper,
	Pipeline,
	PipelineDiagnostic,
	PipelineRunState,
} from '../types';

export const RESOURCE_FRAGMENT_KIND = 'core.resource.fragment' as const;
export type ResourceFragmentKind = typeof RESOURCE_FRAGMENT_KIND;

export const RESOURCE_BUILDER_KIND = 'core.resource.builder' as const;
export type ResourceBuilderKind = typeof RESOURCE_BUILDER_KIND;

export interface ResourcePipelineRunOptions<T, TQuery> {
	readonly config: ResourceConfig<T, TQuery>;
	readonly normalizedConfig: NormalizedResourceConfig<T, TQuery>;
	readonly namespace: string;
	readonly resourceName: string;
	readonly reporter: Reporter;
}

export type ResourcePipelineBuildOptions<T, TQuery> =
	ResourcePipelineRunOptions<T, TQuery>;

export interface ResourcePipelineContext<T, TQuery>
	extends ResourcePipelineBuildOptions<T, TQuery> {
	readonly storeKey: string;
}

export interface ResourcePipelineDraft<T, TQuery> {
	client?: ResourceClient<T, TQuery>;
	cacheKeys?: Required<CacheKeys<TQuery>>;
	resource?: ResourceObject<T, TQuery>;
}

export type ResourcePipelineArtifact<T, TQuery> = ResourcePipelineDraft<
	T,
	TQuery
>;

export type ResourcePipelineRunResult<T, TQuery> = PipelineRunState<
	ResourcePipelineArtifact<T, TQuery>,
	PipelineDiagnostic
>;

export type ResourcePipelineOptions<T, TQuery> = CreatePipelineOptions<
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
	ResourceFragmentKind,
	ResourceBuilderKind,
	ResourceFragmentHelper<T, TQuery>,
	ResourceBuilderHelper<T, TQuery>
>;

export type ResourcePipeline<T, TQuery> = Pipeline<
	ResourcePipelineRunOptions<T, TQuery>,
	ResourcePipelineRunResult<T, TQuery>,
	ResourcePipelineContext<T, TQuery>,
	Reporter,
	ResourcePipelineBuildOptions<T, TQuery>,
	ResourcePipelineArtifact<T, TQuery>,
	ResourceFragmentInput<T, TQuery>,
	ResourcePipelineDraft<T, TQuery>,
	ResourceBuilderInput<T, TQuery>,
	ResourcePipelineArtifact<T, TQuery>,
	PipelineDiagnostic,
	ResourceFragmentKind,
	ResourceBuilderKind,
	ResourceFragmentHelper<T, TQuery>,
	ResourceBuilderHelper<T, TQuery>
>;

export type ResourceFragmentInput<T, TQuery> = ResourceConfig<T, TQuery>;
export type ResourceBuilderInput<T, TQuery> = ResourceConfig<T, TQuery>;

export type ResourceFragmentHelper<T, TQuery> = Helper<
	ResourcePipelineContext<T, TQuery>,
	ResourceFragmentInput<T, TQuery>,
	ResourcePipelineDraft<T, TQuery>,
	Reporter,
	ResourceFragmentKind
>;

export type ResourceBuilderHelper<T, TQuery> = Helper<
	ResourcePipelineContext<T, TQuery>,
	ResourceBuilderInput<T, TQuery>,
	ResourcePipelineArtifact<T, TQuery>,
	Reporter,
	ResourceBuilderKind
>;
