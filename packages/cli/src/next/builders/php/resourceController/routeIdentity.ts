import type { IRRoute } from '../../../ir/publicTypes';
import type { ResolvedIdentity } from '../identity';
import type { RouteMetadataKind } from './metadata';

export interface RouteIdentityContext {
	readonly route: IRRoute;
	readonly routeKind: RouteMetadataKind;
	readonly identity: ResolvedIdentity;
}

export function routeUsesIdentity(context: RouteIdentityContext): boolean {
	if (
		context.routeKind === 'get' ||
		context.routeKind === 'update' ||
		context.routeKind === 'remove'
	) {
		return true;
	}

	const placeholder = `:${context.identity.param.toLowerCase()}`;
	return context.route.path.toLowerCase().includes(placeholder);
}
