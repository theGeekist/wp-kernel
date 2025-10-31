import type {
	MutationMetadataKeys,
	MutationHelperResource,
} from '../../mutation';
import type { ResolvedIdentity } from '../../../../pipeline/identity';

export interface MutationRouteBaseOptions {
	readonly resource: MutationHelperResource;
	readonly pascalName: string;
	readonly metadataKeys: MutationMetadataKeys;
}

export type BuildCreateRouteStatementsOptions = MutationRouteBaseOptions;
export type BuildMutationRouteBaseOptions = MutationRouteBaseOptions;

export interface MutationRouteWithIdentityOptions
	extends MutationRouteBaseOptions {
	readonly identity: ResolvedIdentity;
}

export type BuildUpdateRouteStatementsOptions =
	MutationRouteWithIdentityOptions;
export type BuildDeleteRouteStatementsOptions =
	MutationRouteWithIdentityOptions;
export type BuildMutationRouteWithIdentityOptions =
	MutationRouteWithIdentityOptions;
