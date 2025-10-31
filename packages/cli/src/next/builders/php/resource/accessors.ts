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
	type ResourceAccessorDescriptor,
	type ResourceAccessorRegistry,
} from '@wpkernel/wp-json-ast';

import * as cacheHelpers from './cache';
import * as requestHelpers from './request';
import * as queryHelpers from './query';
import * as errorHelpers from './errors';
import * as wpPostIdentity from './wpPost/identity';
import * as wpPostMutations from './wpPost/mutations';
import * as wpTaxonomyHelpers from './wpTaxonomy/helpers';
import * as wpTaxonomyList from './wpTaxonomy/list';
import * as wpTaxonomyGet from './wpTaxonomy/get';

const wpPostListHelpers = Object.freeze({
	buildListForeachStatement,
	buildListItemsInitialiserStatement,
});

const wpPostMetaQueryHelpers = Object.freeze({
	buildMetaQueryStatements,
	collectMetaQueryEntries,
});

const wpPostTaxonomyQueryHelpers = Object.freeze({
	buildTaxonomyQueryStatements,
	collectTaxonomyQueryEntries,
});

const wpOptionHelpers = Object.freeze({
	buildWpOptionHelperMethods,
	buildWpOptionGetRouteStatements,
	buildWpOptionUpdateRouteStatements,
	buildWpOptionUnsupportedRouteStatements,
});

const transientHelpers = Object.freeze({
	buildTransientHelperMethods,
	buildTransientGetRouteStatements,
	buildTransientSetRouteStatements,
	buildTransientDeleteRouteStatements,
	buildTransientUnsupportedRouteStatements,
});

function buildDescriptor(
	id: string,
	summary: string,
	value: ResourceAccessorDescriptor['value']
): ResourceAccessorDescriptor {
	return { id, summary, value };
}

export const resourceAccessors = buildResourceAccessors({
	storages: [
		{
			kind: 'shared',
			label: 'Shared resource helpers',
			register({ addHelper, addCache }: ResourceAccessorRegistry) {
				addHelper(
					buildDescriptor(
						'request',
						'REST request plumbing helpers.',
						requestHelpers
					)
				);
				addHelper(
					buildDescriptor(
						'query',
						'Shared query helpers for resources.',
						queryHelpers
					)
				);
				addHelper(
					buildDescriptor(
						'errors',
						'Shared WP_Error helpers for resources.',
						errorHelpers
					)
				);
				addCache(
					buildDescriptor(
						'cache',
						'Resource cache metadata helpers.',
						cacheHelpers
					)
				);
			},
		},
		{
			kind: 'wpPost',
			label: 'WP_Post storage accessors',
			register({
				addHelper,
				addQuery,
				addMutation,
			}: ResourceAccessorRegistry) {
				addHelper(
					buildDescriptor(
						'identity',
						'Identity helper methods for WP_Post routes.',
						wpPostIdentity
					)
				);
				addQuery(
					buildDescriptor(
						'list',
						'List route statements and helpers for WP_Post resources.',
						wpPostListHelpers
					)
				);
				addHelper(
					buildDescriptor(
						'metaQuery',
						'Meta query helpers for WP_Post resources.',
						wpPostMetaQueryHelpers
					)
				);
				addHelper(
					buildDescriptor(
						'taxonomyQuery',
						'Taxonomy query helpers for WP_Post resources.',
						wpPostTaxonomyQueryHelpers
					)
				);
				addMutation(
					buildDescriptor(
						'mutations',
						'Mutation route helpers for WP_Post resources.',
						wpPostMutations
					)
				);
			},
		},
		{
			kind: 'wpOption',
			label: 'WP_Option storage accessors',
			register({ addHelper, addMutation }: ResourceAccessorRegistry) {
				const descriptor = buildDescriptor(
					'wpOption',
					'WP_Option helper and route statements.',
					wpOptionHelpers
				);
				addHelper(descriptor);
				addMutation(descriptor);
			},
		},
		{
			kind: 'transient',
			label: 'Transient storage accessors',
			register({ addHelper, addMutation }: ResourceAccessorRegistry) {
				const descriptor = buildDescriptor(
					'transient',
					'Transient helper and route statements.',
					transientHelpers
				);
				addHelper(descriptor);
				addMutation(descriptor);
			},
		},
		{
			kind: 'wpTaxonomy',
			label: 'WP_Taxonomy storage accessors',
			register({ addHelper, addQuery }: ResourceAccessorRegistry) {
				addHelper(
					buildDescriptor(
						'helpers',
						'Taxonomy helper methods for resource routes.',
						wpTaxonomyHelpers
					)
				);
				addQuery(
					buildDescriptor(
						'list',
						'List route statements for taxonomy resources.',
						wpTaxonomyList
					)
				);
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
