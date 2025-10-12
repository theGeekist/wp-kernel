import type { IRResource } from '../../ir';

export interface ResolvedIdentity {
	type: 'number' | 'string';
	param: string;
}

export function resolveIdentityConfig(resource: IRResource): ResolvedIdentity {
	const identity = resource.identity;
	if (!identity) {
		return { type: 'number', param: 'id' };
	}

	const param =
		identity.param ?? (identity.type === 'number' ? 'id' : 'slug');

	return { type: identity.type, param };
}
