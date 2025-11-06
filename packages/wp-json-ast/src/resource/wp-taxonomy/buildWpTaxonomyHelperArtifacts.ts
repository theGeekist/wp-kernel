import type { PhpStmtClassMethod } from '@wpkernel/php-json-ast';

import {
	buildWpTaxonomyHelperMethods,
	type BuildWpTaxonomyHelperMethodsOptions,
	type WpTaxonomyHelperMethod,
} from './helpers';

/**
 * @category WordPress AST
 */
export type BuildWpTaxonomyHelperArtifactsOptions =
	BuildWpTaxonomyHelperMethodsOptions;

/**
 * @category WordPress AST
 */
export interface WpTaxonomyHelperArtifacts {
	readonly helperMethods: readonly PhpStmtClassMethod[];
	readonly helperSignatures: readonly string[];
}

/**
 * @param    options
 * @category WordPress AST
 */
export function buildWpTaxonomyHelperArtifacts(
	options: BuildWpTaxonomyHelperArtifactsOptions
): WpTaxonomyHelperArtifacts {
	const helperDescriptors: readonly WpTaxonomyHelperMethod[] =
		buildWpTaxonomyHelperMethods(options);

	return {
		helperMethods: helperDescriptors.map((helper) => helper.node),
		helperSignatures: helperDescriptors.map((helper) => helper.signature),
	} satisfies WpTaxonomyHelperArtifacts;
}
