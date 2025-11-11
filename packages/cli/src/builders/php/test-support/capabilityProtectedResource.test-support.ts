import type { IRResource } from '../../../ir/publicTypes';
import { makeRoute, makeResource } from './fixtures.test-support';

/**
 * Builds a WP_Post IR resource where write routes require `manage_books`.
 */
export function makeCapabilityProtectedResource(): IRResource {
	return makeResource({
		name: 'books',
		storage: { mode: 'wp-post' },
		identity: { type: 'string', param: 'slug' },
		routes: [
			makeRoute({ method: 'GET', path: '/wpk/v1/books' }),
			makeRoute({ method: 'GET', path: '/wpk/v1/books/:slug' }),
			makeRoute({
				method: 'POST',
				path: '/wpk/v1/books',
				capability: 'manage_books',
			}),
		],
	});
}
