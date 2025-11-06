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
} from '@wpkernel/pipeline';
import type { CorePipelineContext } from '../helpers/context';

/**
 * Helper kind identifier reserved for resource lifecycle fragments.
 *
 * @example
 * ```ts
 * pipeline.ir.use({
 *   key: 'resource.config.enrich',
 *   kind: RESOURCE_FRAGMENT_KIND,
 *   apply: ({ output }) => {
 *     output.cacheKeys = output.cacheKeys ?? { all: () => ['all'] };
 *   },
 * });
 * ```
 */
export const RESOURCE_FRAGMENT_KIND = 'core.resource.fragment' as const;
export type ResourceFragmentKind = typeof RESOURCE_FRAGMENT_KIND;

/**
 * Helper kind identifier reserved for resource builders.
 */
export const RESOURCE_BUILDER_KIND = 'core.resource.builder' as const;
export type ResourceBuilderKind = typeof RESOURCE_BUILDER_KIND;

/**
 * Runtime options passed when executing the resource pipeline.
 *
 * @example
 * ```ts
 * const runOptions: ResourcePipelineRunOptions<{ id: number }, { id: number }> = {
 *   config: resourceConfig,
 *   normalizedConfig,
 *   namespace: 'example/resources',
 *   resourceName: 'Post',
 *   reporter,
 * };
 * ```
 */
export interface ResourcePipelineRunOptions<T, TQuery> {
	/** Original resource configuration provided by `defineResource`. */
	readonly config: ResourceConfig<T, TQuery>;
	/** Normalized configuration with defaults expanded. */
	readonly normalizedConfig: NormalizedResourceConfig<T, TQuery>;
	/** Namespace owning the resource (usually plugin slug). */
	namespace: string;
	/** Canonical resource name used for logging and cache keys. */
	readonly resourceName: string;
	/** Structured reporter used for diagnostics and telemetry. */
	reporter: Reporter;
}

export type ResourcePipelineBuildOptions<T, TQuery> =
	ResourcePipelineRunOptions<T, TQuery>;

/**
 * Shared context passed to every helper in the resource pipeline.
 *
 * @example
 * ```ts
 * const context: ResourcePipelineContext<{ id: number }, { id: number }> = {
 *   ...runOptions,
 *   storeKey: 'example/resources/Post',
 * };
 * ```
 */
export interface ResourcePipelineContext<T, TQuery>
	extends ResourcePipelineBuildOptions<T, TQuery>,
		CorePipelineContext {
	/** Unique key linking store entries and diagnostics to the resource. */
	readonly storeKey: string;
}

/**
 * Mutable draft shared between fragment helpers to assemble resource state.
 *
 * @example
 * ```ts
 * const draft: ResourcePipelineDraft<Post, { id: number }> = {
 *   client: createClient(config, reporter, { namespace, resourceName }),
 *   cacheKeys: createDefaultCacheKeys(resourceName),
 * };
 * ```
 */
export interface ResourcePipelineDraft<T, TQuery> {
	/** Resource client constructed from the provided configuration. */
	client?: ResourceClient<T, TQuery>;
	/** Normalized cache keys available to the public resource object. */
	cacheKeys?: Required<CacheKeys<TQuery>>;
	/** Fully built resource object returned to callers. */
	resource?: ResourceObject<T, TQuery>;
}

/**
 * Final artifact returned from the resource pipeline run.
 */
export type ResourcePipelineArtifact<T, TQuery> = ResourcePipelineDraft<
	T,
	TQuery
>;

/**
 * Structured run result returned to callers of the resource pipeline.
 *
 * @example
 * ```ts
 * const runResult: ResourcePipelineRunResult<Post, { id: number }> = {
 *   artifact: { resource },
 *   diagnostics: [],
 *   steps: [],
 * };
 * ```
 */
export type ResourcePipelineRunResult<T, TQuery> = PipelineRunState<
	ResourcePipelineArtifact<T, TQuery>,
	PipelineDiagnostic
>;

/**
 * Pipeline configuration contract used to instantiate the resource pipeline.
 */
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

/**
 * Fully constructed resource pipeline exposing helper registration and execution.
 */
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

/**
 * Input contract consumed by resource lifecycle fragments.
 */
export type ResourceFragmentInput<T, TQuery> = ResourceConfig<T, TQuery>;
/**
 * Input contract consumed by resource builders.
 */
export type ResourceBuilderInput<T, TQuery> = ResourceConfig<T, TQuery>;

/**
 * Descriptor type for resource fragment helpers.
 */
export type ResourceFragmentHelper<T, TQuery> = Helper<
	ResourcePipelineContext<T, TQuery>,
	ResourceFragmentInput<T, TQuery>,
	ResourcePipelineDraft<T, TQuery>,
	Reporter,
	ResourceFragmentKind
>;

/**
 * Descriptor type for resource builder helpers.
 */
export type ResourceBuilderHelper<T, TQuery> = Helper<
	ResourcePipelineContext<T, TQuery>,
	ResourceBuilderInput<T, TQuery>,
	ResourcePipelineArtifact<T, TQuery>,
	Reporter,
	ResourceBuilderKind
>;
