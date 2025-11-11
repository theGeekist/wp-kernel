/**
 * WordPress Resource Accessors
 *
 * This module provides the canonical registry of WordPress storage accessor helpers
 * for building PHP REST route implementations. It consolidates all WordPress-specific
 * AST builders into a unified, type-safe accessor system.
 *
 * @remarks
 * The accessors are organized by WordPress storage kind:
 * - **Shared**: Cross-cutting concerns (request parsing, queries, errors, cache)
 * - **WP_Post**: Post resources (identity, list, meta queries, taxonomy queries, mutations)
 * - **WP_Option**: Options API (get, update, helpers)
 * - **Transient**: Transient API (get, set, delete, helpers)
 * - **WP_Taxonomy**: Taxonomy resources (helpers, list, get)
 *
 * Each accessor provides PHP AST builders from `@wpkernel/wp-json-ast` organized
 * into frozen helper objects for type safety and immutability.
 *
 * @example
 * ```typescript
 * import { resourceAccessors } from '@wpkernel/cli/builders/php';
 *
 * // Access WP_Post list helpers
 * const { buildListForeachStatement } = resourceAccessors
 *   .storage('wpPost')
 *   .helpers.get('list').value;
 * ```
 *
 * @module builders/php/accessors
 * @packageDocumentation
 */

import {
	buildResourceAccessors,
	buildListForeachStatement,
	buildListItemsInitialiserStatement,
	buildMetaQueryStatements,
	collectMetaQueryEntries,
	buildTaxonomyQueryStatements,
	collectTaxonomyQueryEntries,
	buildWpOptionGetRouteStatements,
	buildWpOptionHelperMethods,
	buildWpOptionUnsupportedRouteStatements,
	buildWpOptionUpdateRouteStatements,
	buildTransientDeleteRouteStatements,
	buildTransientGetRouteStatements,
	buildTransientHelperMethods,
	buildTransientSetRouteStatements,
	buildTransientUnsupportedRouteStatements,
	buildRequestParamAssignmentStatement,
	isNumericIdentity,
	isStringIdentity,
	buildIdentityGuardStatements,
	buildWpTaxonomyHelperArtifacts,
	buildWpTaxonomyHelperMethods,
	buildTaxonomyAssignmentStatement,
	buildGetTaxonomyCall,
	buildResolveTaxonomyTermCall,
	buildPrepareTaxonomyTermResponseCall,
	ensureWpTaxonomyStorage,
	buildWpTaxonomyListRouteStatements,
	buildWpTaxonomyGetRouteStatements,
	// Query helpers
	buildQueryArgsAssignmentStatement,
	buildPaginationNormalisationStatements,
	buildPageExpression,
	buildWpQueryExecutionStatement,
	// Cache helpers
	appendResourceCacheEvent,
	normaliseCacheSegments,
	buildCacheInvalidators,
	// Error helpers
	buildIsWpErrorGuard,
	buildReturnIfWpError,
	buildWpErrorReturn,
	buildWpErrorExpression,
	type ResourceAccessorDescriptor,
	type ResourceAccessorRegistry,
} from '@wpkernel/wp-json-ast';

import {
	buildStatusValidationStatements,
	buildSyncMetaStatements,
	buildSyncTaxonomiesStatements,
	buildCachePrimingStatements,
	buildVariableExpression,
	buildArrayDimExpression,
	buildPropertyExpression,
	syncWpPostMeta,
	syncWpPostTaxonomies,
	prepareWpPostResponse,
} from '@wpkernel/wp-json-ast';

/**
 * WP_Post list route helpers.
 *
 * Provides AST builders for implementing WordPress post list routes with
 * proper foreach iteration and items array initialization.
 *
 * @internal
 */
const wpPostListHelpers = Object.freeze({
	buildListForeachStatement,
	buildListItemsInitialiserStatement,
});

/**
 * WP_Post meta query helpers.
 *
 * Builds PHP AST nodes for querying WordPress post meta fields, including
 * statement generation and entry collection for meta_query parameters.
 *
 * @internal
 */
const wpPostMetaQueryHelpers = Object.freeze({
	buildMetaQueryStatements,
	collectMetaQueryEntries,
});

/**
 * WP_Post taxonomy query helpers.
 *
 * Constructs PHP code for querying posts by taxonomy terms, supporting
 * complex tax_query arrays and term relationship filtering.
 *
 * @internal
 */
const wpPostTaxonomyQueryHelpers = Object.freeze({
	buildTaxonomyQueryStatements,
	collectTaxonomyQueryEntries,
});

/**
 * WP_Option storage helpers.
 *
 * Complete WordPress Options API implementation including get/update routes,
 * helper methods, and proper unsupported route responses.
 *
 * @remarks
 * Supports both single options and autoloaded option handling.
 *
 * @internal
 */
const wpOptionHelpers = Object.freeze({
	buildWpOptionHelperMethods,
	buildWpOptionGetRouteStatements,
	buildWpOptionUpdateRouteStatements,
	buildWpOptionUnsupportedRouteStatements,
});

/**
 * WordPress Transient API helpers.
 *
 * Provides complete transient storage implementation with get/set/delete
 * operations and expiration handling.
 *
 * @remarks
 * Transients are WordPress's simple key-value cache with optional TTL.
 *
 * @internal
 */
const transientHelpers = Object.freeze({
	buildTransientHelperMethods,
	buildTransientGetRouteStatements,
	buildTransientSetRouteStatements,
	buildTransientDeleteRouteStatements,
	buildTransientUnsupportedRouteStatements,
});

/**
 * REST request parameter helpers.
 *
 * Low-level helpers for parsing and assigning REST request parameters
 * from WP_REST_Request into route handler variables.
 *
 * @internal
 */
const requestHelpers = Object.freeze({
	buildRequestParamAssignmentStatement,
});

/**
 * WP_Post identity validation helpers.
 *
 * Type guards and validation statements for WordPress post identity values,
 * handling both numeric post IDs and string slug identifiers.
 *
 * @remarks
 * Essential for proper post ID validation before database queries.
 *
 * @internal
 */
const wpPostIdentity = Object.freeze({
	isNumericIdentity,
	isStringIdentity,
	buildIdentityGuardStatements,
});

/**
 * WP_Taxonomy storage helpers.
 *
 * Comprehensive taxonomy helper methods including artifact generation,
 * term assignment, taxonomy resolution, and term response preparation.
 *
 * @remarks
 * Handles both built-in (category, post_tag) and custom taxonomies.
 *
 * @internal
 */
const wpTaxonomyHelpers = Object.freeze({
	buildWpTaxonomyHelperArtifacts,
	buildWpTaxonomyHelperMethods,
	buildTaxonomyAssignmentStatement,
	buildGetTaxonomyCall,
	buildResolveTaxonomyTermCall,
	buildPrepareTaxonomyTermResponseCall,
	ensureWpTaxonomyStorage,
});

/**
 * WP_Taxonomy list route helpers.
 *
 * Builds PHP statements for listing taxonomy terms with pagination,
 * filtering, and proper REST response formatting.
 *
 * @internal
 */
const wpTaxonomyList = Object.freeze({
	buildWpTaxonomyListRouteStatements,
});

/**
 * WP_Taxonomy get route helpers.
 *
 * Constructs PHP code for retrieving individual taxonomy terms by ID
 * or slug with proper error handling.
 *
 * @internal
 */
const wpTaxonomyGet = Object.freeze({
	buildWpTaxonomyGetRouteStatements,
});

/**
 * WP_Query and pagination helpers.
 *
 * Shared query helpers for WordPress resources including query argument
 * assignment, pagination normalization, and WP_Query execution.
 *
 * @remarks
 * Works across WP_Post, WP_User, and custom post type queries.
 *
 * @internal
 */
const queryHelpers = Object.freeze({
	buildQueryArgsAssignmentStatement,
	buildPaginationNormalisationStatements,
	buildPageExpression,
	buildWpQueryExecutionStatement,
});

/**
 * Resource cache invalidation helpers.
 *
 * Manages WordPress object cache integration and REST route cache
 * invalidation metadata for proper cache purging.
 *
 * @remarks
 * Supports cache segments, invalidation descriptors, and event planning.
 *
 * @internal
 */
const cacheHelpers = Object.freeze({
	appendResourceCacheEvent,
	normaliseCacheSegments,
	buildCacheInvalidators,
});

/**
 * WP_Error handling helpers.
 *
 * Complete WordPress error handling including WP_Error guards,
 * early returns, and error response construction.
 *
 * @remarks
 * Essential for proper WordPress error propagation in REST routes.
 *
 * @internal
 */
const errorHelpers = Object.freeze({
	buildIsWpErrorGuard,
	buildReturnIfWpError,
	buildWpErrorReturn,
	buildWpErrorExpression,
});

/**
 * Creates a resource accessor descriptor.
 *
 * Helper function for building typed accessor descriptors with consistent
 * structure (id, summary, value).
 *
 * @param id      - Unique identifier for the accessor
 * @param summary - Human-readable description
 * @param value   - The helper object or namespace containing AST builders
 * @returns A typed resource accessor descriptor
 *
 * @internal
 */
function buildDescriptor(
	id: string,
	summary: string,
	value: ResourceAccessorDescriptor['value']
): ResourceAccessorDescriptor {
	return { id, summary, value };
}

/**
 * WordPress Resource Accessor Registry
 *
 * The canonical registry of all WordPress storage accessor helpers organized
 * by storage kind. This is the single source of truth for WordPress-specific
 * PHP AST builders used across the framework.
 *
 * @remarks
 * ## Storage Kinds
 *
 * ### Shared
 * Cross-cutting helpers available to all storage types:
 * - **request**: REST request parameter parsing
 * - **query**: WP_Query and pagination
 * - **errors**: WP_Error handling
 * - **cache**: Cache invalidation metadata
 *
 * ### WP_Post
 * WordPress post resource helpers:
 * - **identity**: Post ID validation and type guards
 * - **list**: List route with foreach iteration
 * - **metaQuery**: Post meta field queries
 * - **taxonomyQuery**: Taxonomy term filtering
 * - **mutations**: Create, update, delete operations
 *
 * ### WP_Option
 * WordPress Options API:
 * - **wpOption**: Get/update routes and helper methods
 *
 * ### Transient
 * WordPress Transient API:
 * - **transient**: Get/set/delete routes with TTL support
 *
 * ### WP_Taxonomy
 * WordPress taxonomy resources:
 * - **helpers**: Term resolution and assignment
 * - **list**: List taxonomy terms
 * - **get**: Get individual term
 *
 * @example
 * ```typescript
 * // Access WP_Post identity helpers
 * const postStorage = resourceAccessors.storage('wpPost');
 * const identityHelpers = postStorage.helpers.get('identity');
 * const { isNumericIdentity } = identityHelpers.value;
 *
 * // Access shared query helpers
 * const sharedStorage = resourceAccessors.storage('shared');
 * const queryHelpers = sharedStorage.helpers.get('query');
 * ```
 *
 * @public
 */
export const resourceAccessors = buildResourceAccessors({
	storages: [
		// ═══════════════════════════════════════════════════════════════════
		// SHARED STORAGE - Cross-cutting helpers for all resource types
		// ═══════════════════════════════════════════════════════════════════
		{
			kind: 'shared',
			label: 'Shared resource helpers',
			register({ addHelper, addCache }: ResourceAccessorRegistry) {
				// REST request parameter parsing
				// Extracts and assigns parameters from WP_REST_Request objects
				addHelper(
					buildDescriptor(
						'request',
						'REST request plumbing helpers.',
						requestHelpers
					)
				);

				// WP_Query and pagination helpers
				// Handles query arg normalization, pagination, and WP_Query execution
				addHelper(
					buildDescriptor(
						'query',
						'Shared query helpers for resources.',
						queryHelpers
					)
				);

				// WP_Error guards and error handling
				// Type guards, early returns, and WP_Error response construction
				addHelper(
					buildDescriptor(
						'errors',
						'Shared WP_Error helpers for resources.',
						errorHelpers
					)
				);

				// Cache invalidation metadata
				// Manages cache segments and invalidation descriptors for REST routes
				addCache(
					buildDescriptor(
						'cache',
						'Resource cache metadata helpers.',
						cacheHelpers
					)
				);
			},
		},
		// ═══════════════════════════════════════════════════════════════════
		// WP_POST STORAGE - WordPress post resources (posts, pages, CPTs)
		// ═══════════════════════════════════════════════════════════════════
		{
			kind: 'wpPost',
			label: 'WP_Post storage accessors',
			register({
				addHelper,
				addQuery,
				addMutation,
			}: ResourceAccessorRegistry) {
				// Identity validation for post IDs and slugs
				// Validates numeric IDs vs string slugs before database operations
				addHelper(
					buildDescriptor(
						'identity',
						'Identity helper methods for WP_Post routes.',
						wpPostIdentity
					)
				);

				// List route implementation
				// Foreach iteration over WP_Query results with items array initialization
				addQuery(
					buildDescriptor(
						'list',
						'List route statements and helpers for WP_Post resources.',
						wpPostListHelpers
					)
				);

				// Post meta field queries
				// Builds meta_query arrays for querying custom fields
				addHelper(
					buildDescriptor(
						'metaQuery',
						'Meta query helpers for WP_Post resources.',
						wpPostMetaQueryHelpers
					)
				);

				// Taxonomy term filtering
				// Builds tax_query arrays for filtering by categories, tags, etc.
				addHelper(
					buildDescriptor(
						'taxonomyQuery',
						'Taxonomy query helpers for WP_Post resources.',
						wpPostTaxonomyQueryHelpers
					)
				);

				// Create, update, delete operations
				// Mutation helpers for modifying post data via REST API
				addMutation(
					buildDescriptor(
						'mutations',
						'Mutation route helpers for WP_Post resources.',
						{
							buildStatusValidationStatements,
							buildSyncMetaStatements,
							buildSyncTaxonomiesStatements,
							buildCachePrimingStatements,
							buildVariableExpression,
							buildArrayDimExpression,
							buildPropertyExpression,
							syncWpPostMeta,
							syncWpPostTaxonomies,
							prepareWpPostResponse,
						}
					)
				);
			},
		},
		// ═══════════════════════════════════════════════════════════════════
		// WP_OPTION STORAGE - WordPress Options API (get_option/update_option)
		// ═══════════════════════════════════════════════════════════════════
		{
			kind: 'wpOption',
			label: 'WP_Option storage accessors',
			register({ addHelper, addMutation }: ResourceAccessorRegistry) {
				// Complete Options API implementation
				// Handles get_option(), update_option(), and helper methods
				// Registered as both helper (for utility methods) and mutation (for update routes)
				const descriptor = buildDescriptor(
					'wpOption',
					'WP_Option helper and route statements.',
					wpOptionHelpers
				);
				addHelper(descriptor);
				addMutation(descriptor);
			},
		},
		// ═══════════════════════════════════════════════════════════════════
		// TRANSIENT STORAGE - WordPress Transient API (temporary cache with TTL)
		// ═══════════════════════════════════════════════════════════════════
		{
			kind: 'transient',
			label: 'Transient storage accessors',
			register({ addHelper, addMutation }: ResourceAccessorRegistry) {
				// Complete Transient API implementation
				// Handles get/set/delete_transient() with optional expiration
				// Registered as both helper (for utility methods) and mutation (for set/delete routes)
				const descriptor = buildDescriptor(
					'transient',
					'Transient helper and route statements.',
					transientHelpers
				);
				addHelper(descriptor);
				addMutation(descriptor);
			},
		},
		// ═══════════════════════════════════════════════════════════════════
		// WP_TAXONOMY STORAGE - WordPress taxonomy resources (categories, tags, custom taxonomies)
		// ═══════════════════════════════════════════════════════════════════
		{
			kind: 'wpTaxonomy',
			label: 'WP_Taxonomy storage accessors',
			register({ addHelper, addQuery }: ResourceAccessorRegistry) {
				// Taxonomy utility methods
				// Term resolution, assignment, response preparation, and storage setup
				addHelper(
					buildDescriptor(
						'helpers',
						'Taxonomy helper methods for resource routes.',
						wpTaxonomyHelpers
					)
				);

				// List taxonomy terms route
				// Pagination, filtering, and REST response formatting for term lists
				addQuery(
					buildDescriptor(
						'list',
						'List route statements for taxonomy resources.',
						wpTaxonomyList
					)
				);

				// Get single taxonomy term route
				// Retrieve individual terms by ID or slug with WP_Error handling
				addQuery(
					buildDescriptor(
						'get',
						'Get route statements for taxonomy resources.',
						wpTaxonomyGet
					)
				);
			},
		},
	],
});
