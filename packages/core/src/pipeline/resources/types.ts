import type { Reporter } from '../../reporter/types';
import type {
	CacheKeys,
	ResourceClient,
	ResourceConfig,
	ResourceObject,
} from '../../resource/types';
import type { ResourceGroupedApiGetters } from '../../resource/grouped-api';
import type { NormalizedResourceConfig } from '../../resource/buildResourceObject';
import type {
	CreatePipelineOptions,
	Helper,
	MaybePromise,
	Pipeline,
	PipelineDiagnostic,
	PipelineRunState,
} from '../types';
import type {
	CorePipelineContext,
	CorePipelineRegistryBridge,
} from '../helpers/context';

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
 * };
 * ```
 */
export interface ResourcePipelineRunOptions<T, TQuery> {
	/** Original resource configuration provided by `defineResource`. */
	readonly config: ResourceConfig<T, TQuery>;
	/** Optional registry hooks surfaced to helper orchestration. */
	readonly registry?: CorePipelineRegistryBridge;
}

export type ResourcePipelineBuildOptions<T, TQuery> =
	ResourcePipelineRunOptions<T, TQuery>;

/**
 * Shared context passed to every helper in the resource pipeline.
 *
 * @example
 * ```ts
 * const context: ResourcePipelineContext<{ id: number }, { id: number }> = {
 *   config: resourceConfig,
 *   namespace: 'example/resources',
 *   resourceName: 'Post',
 *   reporter,
 *   storeKey: 'example/resources/Post',
 * };
 * ```
 */
export interface ResourcePipelineContext<T, TQuery>
	extends CorePipelineContext {
	/** Original resource configuration provided by `defineResource`. */
	readonly config: ResourceConfig<T, TQuery>;
	/** Canonical resource name resolved by helper execution. */
	resourceName: string;
	/** Normalized configuration with defaults expanded. */
	normalizedConfig?: NormalizedResourceConfig<T, TQuery>;
	/** Unique key linking store entries and diagnostics to the resource. */
	storeKey: string;
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
	/** Resolved namespace for the resource once helpers execute. */
	namespace?: string;
	/** Canonical resource name resolved by helper execution. */
	resourceName?: string;
	/** Store key derived from the namespace/resource pair. */
	storeKey?: string;
	/** Structured reporter resolved for the resource definition. */
	reporter?: Reporter;
	/** Resource client constructed from the provided configuration. */
	client?: ResourceClient<T, TQuery>;
	/** Normalized cache keys available to the public resource object. */
	cacheKeys?: Required<CacheKeys<TQuery>>;
	/** Grouped API getter factories assembled for the resource object. */
	groupedApi?: ResourceGroupedApiGetters<T, TQuery>;
	/** Fully built resource object returned to callers. */
	resource?: ResourceObject<T, TQuery>;
	/** Deferred side-effect hooks scheduled for commit/rollback. */
	sideEffects?: ResourcePipelineSideEffects;
}

/**
 * Collection of deferred commit/rollback tasks prepared by builders.
 */
export interface ResourcePipelineSideEffects {
	readonly commits: ResourcePipelineSideEffectTask[];
	readonly rollbacks: ResourcePipelineSideEffectTask[];
}

/**
 * Task signature for deferred resource side effects.
 */
export type ResourcePipelineSideEffectTask = () => MaybePromise<void> | void;

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
