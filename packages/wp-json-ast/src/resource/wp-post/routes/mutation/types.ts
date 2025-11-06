import type {
	MutationMetadataKeys,
	MutationHelperResource,
} from '../../mutation';
import type { ResolvedIdentity } from '../../../../pipeline/identity';

/**
 * @category WordPress AST
 */
export interface MutationRouteBaseOptions {
	readonly resource: MutationHelperResource;
	readonly pascalName: string;
	readonly metadataKeys: MutationMetadataKeys;
}

/**
 * @category WordPress AST
 */
export type BuildCreateRouteStatementsOptions = MutationRouteBaseOptions;
/**
 * @category WordPress AST
 */
export type BuildMutationRouteBaseOptions = MutationRouteBaseOptions;

/**
 * @category WordPress AST
 */
export interface MutationRouteWithIdentityOptions
	extends MutationRouteBaseOptions {
	readonly identity: ResolvedIdentity;
}

/**
 * @category WordPress AST
 */
export type BuildUpdateRouteStatementsOptions =
	MutationRouteWithIdentityOptions;
/**
 * @category WordPress AST
 */
export type BuildDeleteRouteStatementsOptions =
	MutationRouteWithIdentityOptions;
/**
 * @category WordPress AST
 */
export type BuildMutationRouteWithIdentityOptions =
	MutationRouteWithIdentityOptions;
