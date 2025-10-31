import type { PhpStmtClassMethod } from '@wpkernel/php-json-ast';

import {
	buildWpTaxonomyHelperMethods,
	type BuildWpTaxonomyHelperMethodsOptions,
	type WpTaxonomyHelperMethod,
} from './helpers';

export type BuildWpTaxonomyHelperArtifactsOptions =
	BuildWpTaxonomyHelperMethodsOptions;

export interface WpTaxonomyHelperArtifacts {
	readonly helperMethods: readonly PhpStmtClassMethod[];
	readonly helperSignatures: readonly string[];
}

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
