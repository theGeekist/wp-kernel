import { collectCanonicalBasePaths, determineRouteKind } from '../routes';
import { makeWpPostRoutes } from '@wpkernel/test-utils/next/builders/php/resources.test-support';

describe('routes helpers', () => {
	const identityParam = 'slug';

	it('collects canonical base paths using identity routes when available', () => {
		const routes = makeWpPostRoutes();

		const basePaths = collectCanonicalBasePaths(routes, identityParam);

		expect(Array.from(basePaths)).toEqual(['/kernel/v1/books']);
	});

	it('classifies routes by HTTP method and path patterns', () => {
		const routes = makeWpPostRoutes();
		const basePaths = collectCanonicalBasePaths(routes, identityParam);

		const listRoute = getRouteBy(
			routes,
			(route) => route.method === 'GET' && !route.path.includes(':')
		);
		const getRoute = getRouteBy(
			routes,
			(route) => route.method === 'GET' && route.path.includes(':')
		);
		const updateRoute = getRouteBy(
			routes,
			(route) => route.method === 'PUT'
		);
		const deleteRoute = getRouteBy(
			routes,
			(route) => route.method === 'DELETE'
		);
		const postRoute = getRouteBy(
			routes,
			(route) => route.method === 'POST'
		);

		expect(determineRouteKind(listRoute, identityParam, basePaths)).toBe(
			'list'
		);
		expect(determineRouteKind(getRoute, identityParam, basePaths)).toBe(
			'get'
		);
		expect(determineRouteKind(updateRoute, identityParam, basePaths)).toBe(
			'update'
		);
		expect(determineRouteKind(deleteRoute, identityParam, basePaths)).toBe(
			'remove'
		);
		expect(determineRouteKind(postRoute, identityParam, basePaths)).toBe(
			'create'
		);
	});

	it('returns undefined for custom routes outside canonical patterns', () => {
		const routes = makeWpPostRoutes();
		const basePaths = collectCanonicalBasePaths(routes, identityParam);

		const customRoute = {
			method: 'POST',
			path: '/kernel/v1/books/(?P<action>publish)',
			policy: undefined,
			hash: 'custom',
			transport: 'local',
		} satisfies ReturnType<typeof makeWpPostRoutes>[number];

		expect(
			determineRouteKind(customRoute, identityParam, basePaths)
		).toBeUndefined();
	});
});

function getRouteBy(
	routes: ReturnType<typeof makeWpPostRoutes>,
	matcher: (route: ReturnType<typeof makeWpPostRoutes>[number]) => boolean
) {
	const route = routes.find(matcher);
	if (!route) {
		throw new Error('Expected route to be defined.');
	}
	return route;
}
