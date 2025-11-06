/**
 * @category WordPress AST
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
 * @category WordPress AST
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
