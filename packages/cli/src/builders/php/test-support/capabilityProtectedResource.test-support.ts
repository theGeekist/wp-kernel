import type { IRResource } from '../../../../ir/publicTypes';
import {
	makeWpPostResource,
	makeWpPostRoutes,
} from '@wpkernel/test-utils/builders/php/resources.test-support';

export function makeCapabilityProtectedResource(): IRResource {
	const routes = makeWpPostRoutes().map((route) =>
		route.method === 'POST'
			? { ...route, capability: 'manage_books' }
			: route
	);

	return makeWpPostResource({ routes }) as unknown as IRResource;
}
