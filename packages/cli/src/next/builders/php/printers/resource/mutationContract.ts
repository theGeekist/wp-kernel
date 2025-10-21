/**
 * Shared contract for resource mutation work.
 *
 * Phase 3 introduces two concurrent tracks (controller builders and shared macros)
 * that must align on helper names, metadata tags, and mutation kinds. Capturing
 * the shared shape up-front lets each scope land independently without drifting
 * from the agreed runtime surface.
 */
export interface ResourceMutationContract {
	readonly mutationKinds: readonly ('create' | 'update' | 'delete')[];
	readonly helperFactories: {
		readonly syncMeta: string;
		readonly syncTaxonomies: string;
		readonly prepareResponse: string;
	};
	readonly macroFactories: {
		readonly mutationGuard: string;
	};
	readonly metadataKeys: {
		readonly cacheSegment: string;
		readonly channelTag: string;
		readonly statusValidation: string;
		readonly syncMeta: string;
		readonly syncTaxonomies: string;
		readonly cachePriming: string;
	};
}

/**
 * The wp-post implementation will honour this contract once the Phase 3 scopes
 * land. Future resource domains can clone the pattern to define their own
 * mutation contracts without coupling to the wp-post naming.
 */
export const WP_POST_MUTATION_CONTRACT: ResourceMutationContract = {
	mutationKinds: ['create', 'update', 'delete'],
	helperFactories: {
		syncMeta: 'syncWpPostMeta',
		syncTaxonomies: 'syncWpPostTaxonomies',
		prepareResponse: 'prepareWpPostResponse',
	},
	macroFactories: {
		mutationGuard: 'createWpPostMutationGuard',
	},
	metadataKeys: {
		cacheSegment: 'cache:wp-post',
		channelTag: 'resource.wpPost.mutation',
		statusValidation: 'mutation:status',
		syncMeta: 'mutation:meta',
		syncTaxonomies: 'mutation:taxonomies',
		cachePriming: 'mutation:cache',
	},
} as const;
