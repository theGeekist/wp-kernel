import type { IRRoute } from '../../../../ir/types';
import { collectCanonicalBasePaths, determineRouteKind } from '../routes';

describe('routes helpers', () => {
	const identityParam = 'slug';

	it('collects canonical base paths using identity routes when available', () => {
		const routes = createRoutes();

		const basePaths = collectCanonicalBasePaths(routes, identityParam);

		expect(Array.from(basePaths)).toEqual(['/kernel/v1/books']);
	});

	it('classifies routes by HTTP method and path patterns', () => {
		const routes = createRoutes();
		const basePaths = collectCanonicalBasePaths(routes, identityParam);

		const listRoute = routes[0];
		const getRoute = routes[1];
		const updateRoute = routes[2];
		const deleteRoute = routes[3];
		const createRoute = routes[4];

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
		expect(determineRouteKind(createRoute, identityParam, basePaths)).toBe(
			'create'
		);
	});

	it('returns undefined for custom routes outside canonical patterns', () => {
		const routes = createRoutes();
		const basePaths = collectCanonicalBasePaths(routes, identityParam);

		const customRoute: IRRoute = {
			method: 'POST',
			path: '/kernel/v1/books/(?P<action>publish)',
			policy: undefined,
			hash: 'custom',
			transport: 'local',
		};

		expect(
			determineRouteKind(customRoute, identityParam, basePaths)
		).toBeUndefined();
	});
});

function createRoutes(): IRRoute[] {
	return [
		{
			method: 'GET',
			path: '/kernel/v1/books',
			policy: undefined,
			hash: 'list',
			transport: 'local',
		},
		{
			method: 'GET',
			path: '/kernel/v1/books/:slug',
			policy: undefined,
			hash: 'get',
			transport: 'local',
		},
		{
			method: 'PATCH',
			path: '/kernel/v1/books/:slug',
			policy: undefined,
			hash: 'update',
			transport: 'local',
		},
		{
			method: 'DELETE',
			path: '/kernel/v1/books/:slug',
			policy: undefined,
			hash: 'delete',
			transport: 'local',
		},
		{
			method: 'POST',
			path: '/kernel/v1/books',
			policy: undefined,
			hash: 'create',
			transport: 'local',
		},
	];
}
