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
	appendStatusValidationMacro,
	appendSyncMetaMacro,
	appendSyncTaxonomiesMacro,
	appendCachePrimingMacro,
	buildVariableExpression,
	buildArrayDimExpression,
	buildPropertyExpression,
	type MacroExpression,
} from './macros';
export type {
	BuildCreateRouteBodyOptions,
	BuildDeleteRouteBodyOptions,
	BuildMutationRouteBodyBaseOptions,
	BuildUpdateRouteBodyOptions,
} from './routes';
export {
	buildCreateRouteBody,
	buildUpdateRouteBody,
	buildDeleteRouteBody,
} from './routes';
export {
	syncWpPostMeta,
	syncWpPostTaxonomies,
	prepareWpPostResponse,
	type MutationHelperOptions,
} from './helpers';
