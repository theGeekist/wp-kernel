/* istanbul ignore file -- module solely consolidates wp-json-ast re-exports */

/**
 * wp-post mutation surface for the AST pipeline.
 *
 * The shared contract keeps Scope 1 (route builders + helpers) and Scope 2
 * (macros) aligned on helper names, metadata keys, and mutation kinds so the
 * controller can compose everything without pulling in the legacy string
 * printers.
 */
export { WP_POST_MUTATION_CONTRACT } from '../../mutationContract';
export type { ResourceMutationContract } from '../../mutationContract';
export {
	buildStatusValidationStatements,
	buildSyncMetaStatements,
	buildSyncTaxonomiesStatements,
	buildCachePrimingStatements,
	buildVariableExpression,
	buildArrayDimExpression,
	buildPropertyExpression,
	type MacroExpression,
	type MutationMetadataKeys,
} from './macros';
export type {
	BuildCreateRouteStatementsOptions,
	BuildDeleteRouteStatementsOptions,
	BuildMutationRouteBaseOptions,
	BuildUpdateRouteStatementsOptions,
} from './routes';
export {
	buildCreateRouteStatements,
	buildUpdateRouteStatements,
	buildDeleteRouteStatements,
} from './routes';
export {
	syncWpPostMeta,
	syncWpPostTaxonomies,
	prepareWpPostResponse,
	type MutationHelperOptions,
	type MutationIdentity,
} from './helpers';
