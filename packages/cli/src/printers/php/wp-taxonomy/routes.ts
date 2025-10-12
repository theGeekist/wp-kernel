import type { IRRoute } from '../../../ir';
import type { WpTaxonomyRouteKind } from './types';

export function determineWpTaxonomyRouteKind(
	route: IRRoute,
	identityParam: string
): WpTaxonomyRouteKind {
	const normalizedPath = route.path.toLowerCase();
	const identityPlaceholder = `:${identityParam.toLowerCase()}`;
	const hasIdentity = normalizedPath.includes(identityPlaceholder);

	switch (route.method) {
		case 'GET':
			return hasIdentity ? 'get' : 'list';
		case 'POST':
			return 'create';
		case 'PUT':
		case 'PATCH':
			return hasIdentity ? 'update' : 'unsupported';
		case 'DELETE':
			return hasIdentity ? 'remove' : 'unsupported';
		default:
			return 'unsupported';
	}
}
