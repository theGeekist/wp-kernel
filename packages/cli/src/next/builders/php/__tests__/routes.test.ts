import {
	collectCanonicalBasePaths,
	determineRouteKind,
	getPathSegments,
	normalizeRoutePath,
} from '../routes';
import { makeWpPostRoutes } from '@wpkernel/test-utils/next/builders/php/resources.test-support';
import type { IRRoute } from '../../../ir/publicTypes';

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

	it('derives canonical paths from non-identity routes when needed', () => {
		const routes: IRRoute[] = [
			makeRoute({ method: 'GET', path: '/books' }),
			makeRoute({ method: 'GET', path: '/books/popular' }),
			makeRoute({ method: 'POST', path: '/authors' }),
		];

		const basePaths = collectCanonicalBasePaths(routes, identityParam);
		expect(Array.from(basePaths).sort()).toEqual(['/authors', '/books']);
	});

	it('returns an empty set when no canonical base path can be derived', () => {
		const routes: IRRoute[] = [
			makeRoute({ method: 'GET', path: '/kernel/v1/books/:id' }),
			makeRoute({ method: 'POST', path: '/kernel/v1/books/:id/publish' }),
		];

		const basePaths = collectCanonicalBasePaths(routes, identityParam);
		expect(basePaths.size).toBe(0);
	});

	it('normalises route paths and segments consistently', () => {
		expect(normalizeRoutePath('kernel/v1/books/')).toBe('/kernel/v1/books');
		expect(normalizeRoutePath('/kernel//v1//books')).toBe(
			'/kernel/v1/books'
		);
		expect(normalizeRoutePath('/')).toBe('/');

		expect(getPathSegments('/kernel/v1/books/:slug')).toEqual([
			'kernel',
			'v1',
			'books',
			':slug',
		]);
		expect(getPathSegments('/')).toEqual([]);
	});

	it('treats unsupported method and path combinations as custom routes', () => {
		const routes = makeWpPostRoutes();
		const basePaths = collectCanonicalBasePaths(routes, identityParam);
		const putCollectionRoute = makeRoute({
			method: 'PUT',
			path: '/kernel/v1/books',
		});

		expect(
			determineRouteKind(putCollectionRoute, identityParam, basePaths)
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

function makeRoute(route: Pick<IRRoute, 'method' | 'path'>): IRRoute {
	return {
		...route,
		transport: 'local',
		hash: `${route.method}:${route.path}`,
		policy: undefined,
	} satisfies IRRoute;
}
