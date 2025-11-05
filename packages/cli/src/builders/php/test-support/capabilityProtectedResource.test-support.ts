import type { IRResource } from '../../../ir/publicTypes';
import {
	makeWpPostResource,
	makeWpPostRoutes,
} from '@wpkernel/test-utils/builders/php/resources.test-support';

/**
 * Creates a test IR resource with capability-protected routes.
 *
 * Generates a WP_Post resource where POST routes require 'manage_books' capability.
 * Used for testing capability-based authorization in generated PHP controllers.
 *
 * @returns IR resource with capability-protected POST routes
 * @category Builders
 */
export function makeCapabilityProtectedResource(): IRResource {
	const routes = makeWpPostRoutes().map((route) =>
		route.method === 'POST'
			? { ...route, capability: 'manage_books' }
			: route
	);

	return makeWpPostResource({ routes }) as unknown as IRResource;
}
