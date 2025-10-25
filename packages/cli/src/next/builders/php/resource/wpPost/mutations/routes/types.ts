import type { IRResource } from '../../../../../../../ir/types';
import type { ResolvedIdentity } from '../../../../identity';
import type { ResourceMutationContract } from '../../../mutationContract';

export interface BuildMutationRouteBaseOptions {
	readonly resource: IRResource;
	readonly pascalName: string;
	readonly metadataKeys: ResourceMutationContract['metadataKeys'];
}

export type BuildCreateRouteStatementsOptions = BuildMutationRouteBaseOptions;

export interface BuildMutationRouteWithIdentityOptions
	extends BuildMutationRouteBaseOptions {
	readonly identity: ResolvedIdentity;
}

export type BuildUpdateRouteStatementsOptions =
	BuildMutationRouteWithIdentityOptions;
export type BuildDeleteRouteStatementsOptions =
	BuildMutationRouteWithIdentityOptions;
