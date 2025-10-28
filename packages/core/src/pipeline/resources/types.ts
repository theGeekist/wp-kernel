import type { Reporter } from '../../reporter/types';
import type {
	CacheKeys,
	ResourceClient,
	ResourceConfig,
	ResourceObject,
} from '../../resource/types';
import type { NormalizedResourceConfig } from '../../resource/buildResourceObject';
import type { Helper, PipelineDiagnostic, PipelineRunState } from '../types';

export type ResourceFragmentKind = 'core.resource.fragment';
export type ResourceBuilderKind = 'core.resource.builder';

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
