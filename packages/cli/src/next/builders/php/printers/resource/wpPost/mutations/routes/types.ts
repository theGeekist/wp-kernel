import type { PhpMethodBodyBuilder } from '@wpkernel/php-json-ast/templates';
import type { IRResource } from '../../../../../../../../ir/types';
import type { ResolvedIdentity } from '../../../../identity';
import type { ResourceMutationContract } from '../../../mutationContract';

export interface BuildMutationRouteBodyBaseOptions {
	readonly body: PhpMethodBodyBuilder;
	readonly indentLevel: number;
	readonly resource: IRResource;
	readonly pascalName: string;
	readonly metadataKeys: ResourceMutationContract['metadataKeys'];
}

export type BuildCreateRouteBodyOptions = BuildMutationRouteBodyBaseOptions;

export interface BuildMutationRouteWithIdentityOptions
	extends BuildMutationRouteBodyBaseOptions {
	readonly identity: ResolvedIdentity;
}

export type BuildUpdateRouteBodyOptions = BuildMutationRouteWithIdentityOptions;
export type BuildDeleteRouteBodyOptions = BuildMutationRouteWithIdentityOptions;
