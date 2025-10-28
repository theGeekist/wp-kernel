import {
	buildResourceCacheKeysPlan,
	buildResourceControllerMetadata,
	buildResourceControllerRouteMetadata,
	collectCanonicalBasePaths,
	determineRouteKind,
	getPathSegments,
	normalizeRoutePath,
	routeUsesIdentity,
	type RouteDefinition,
} from '../resourceController';

describe('resource controller metadata builder', () => {
	it('creates metadata with cloned cache key segments', () => {
		const routes = buildFixtureRoutes();
		const listSegments = ['list'];
		const getSegments = ['get'];
		const createSegments = ['create'];
		const updateSegments = ['update'];
		const removeSegments = ['remove'];
		const cacheKeys = buildResourceCacheKeysPlan({
			list: { segments: listSegments },
			get: { segments: getSegments },
			create: { segments: createSegments },
			update: { segments: updateSegments },
			remove: { segments: removeSegments },
		});

		const metadata = buildResourceControllerMetadata({
			name: 'books',
			identity: { type: 'string', param: 'slug' },
			routes,
			cacheKeys,
			mutationMetadata: { channelTag: 'resource.wpPost.mutation' },
		});

		expect(metadata).toEqual({
			kind: 'resource-controller',
			name: 'books',
			identity: { type: 'string', param: 'slug' },
			routes: [
				{
					method: 'GET',
					path: '/kernel/v1/books',
					kind: 'list',
					cacheSegments: ['list'],
				},
				{
					method: 'GET',
					path: '/kernel/v1/books/:slug',
					kind: 'get',
					cacheSegments: ['get'],
				},
				{
					method: 'POST',
					path: '/kernel/v1/books',
					kind: 'create',
					cacheSegments: ['create'],
					tags: {
						'resource.wpPost.mutation': 'create',
					},
				},
				{
					method: 'PUT',
					path: '/kernel/v1/books/:slug',
					kind: 'update',
					cacheSegments: ['update'],
					tags: {
						'resource.wpPost.mutation': 'update',
					},
				},
				{
					method: 'DELETE',
					path: '/kernel/v1/books/:slug',
					kind: 'remove',
					cacheSegments: ['remove'],
					tags: {
						'resource.wpPost.mutation': 'delete',
					},
				},
			],
		});

		listSegments.push('mutated');
		expect(metadata.routes[0]?.cacheSegments).toEqual(['list']);
	});
});

describe('resource controller metadata helpers', () => {
	const identityParam = 'slug';

	it('collects canonical base paths using identity routes when available', () => {
		const routes = buildFixtureRoutes();

		const basePaths = collectCanonicalBasePaths(routes, identityParam);

		expect(Array.from(basePaths)).toEqual(['/kernel/v1/books']);
	});

	it('classifies routes by HTTP method and path patterns', () => {
		const routes = buildFixtureRoutes();
		const basePaths = collectCanonicalBasePaths(routes, identityParam);

		expect(determineRouteKind(routes[0]!, identityParam, basePaths)).toBe(
			'list'
		);
		expect(determineRouteKind(routes[1]!, identityParam, basePaths)).toBe(
			'get'
		);
		expect(determineRouteKind(routes[2]!, identityParam, basePaths)).toBe(
			'create'
		);
		expect(determineRouteKind(routes[3]!, identityParam, basePaths)).toBe(
			'update'
		);
		expect(determineRouteKind(routes[4]!, identityParam, basePaths)).toBe(
			'remove'
		);
	});

	it('returns undefined for custom routes outside canonical patterns', () => {
		const routes = buildFixtureRoutes();
		const basePaths = collectCanonicalBasePaths(routes, identityParam);

		const customRoute: RouteDefinition = {
			method: 'POST',
			path: '/kernel/v1/books/(?P<action>publish)',
		};

		expect(
			determineRouteKind(customRoute, identityParam, basePaths)
		).toBeUndefined();
	});

	it('derives canonical paths from non-identity routes when needed', () => {
		const routes: RouteDefinition[] = [
			{ method: 'GET', path: '/books' },
			{ method: 'GET', path: '/books/popular' },
			{ method: 'POST', path: '/authors' },
		];

		const basePaths = collectCanonicalBasePaths(routes, identityParam);
		expect(Array.from(basePaths).sort()).toEqual(['/authors', '/books']);
	});

	it('returns an empty set when no canonical base path can be derived', () => {
		const routes: RouteDefinition[] = [
			{ method: 'GET', path: '/kernel/v1/books/:id' },
			{ method: 'POST', path: '/kernel/v1/books/:id/publish' },
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

	it('detects routes that reference the resource identity', () => {
		const routes = buildFixtureRoutes();
		const basePaths = collectCanonicalBasePaths(routes, identityParam);

		const metadata = buildResourceControllerRouteMetadata({
			routes,
			identity: { param: identityParam },
			canonicalBasePaths: basePaths,
			cacheKeys: buildCacheKeys(),
		});

		expect(
			routeUsesIdentity({
				route: routes[0]!,
				routeKind: metadata[0]!.kind,
				identity: { param: identityParam },
			})
		).toBe(false);
		expect(
			routeUsesIdentity({
				route: routes[1]!,
				routeKind: metadata[1]!.kind,
				identity: { param: identityParam },
			})
		).toBe(true);
	});

	it('builds route metadata with cache segments and mutation tags', () => {
		const routes = buildFixtureRoutes();
		const basePaths = collectCanonicalBasePaths(routes, identityParam);

		const metadata = buildResourceControllerRouteMetadata({
			routes,
			identity: { param: identityParam },
			canonicalBasePaths: basePaths,
			cacheKeys: buildCacheKeys(),
			mutationMetadata: { channelTag: 'resource.wpPost.mutation' },
		});

		expect(metadata).toEqual([
			{
				method: 'GET',
				path: '/kernel/v1/books',
				kind: 'list',
				cacheSegments: ['list'],
			},
			{
				method: 'GET',
				path: '/kernel/v1/books/:slug',
				kind: 'get',
				cacheSegments: ['get'],
			},
			{
				method: 'POST',
				path: '/kernel/v1/books',
				kind: 'create',
				cacheSegments: ['create'],
				tags: { 'resource.wpPost.mutation': 'create' },
			},
			{
				method: 'PUT',
				path: '/kernel/v1/books/:slug',
				kind: 'update',
				cacheSegments: ['update'],
				tags: { 'resource.wpPost.mutation': 'update' },
			},
			{
				method: 'DELETE',
				path: '/kernel/v1/books/:slug',
				kind: 'remove',
				cacheSegments: ['remove'],
				tags: { 'resource.wpPost.mutation': 'delete' },
			},
		]);
	});
});

function buildFixtureRoutes(): RouteDefinition[] {
	return [
		{ method: 'GET', path: '/kernel/v1/books' },
		{ method: 'GET', path: '/kernel/v1/books/:slug' },
		{ method: 'POST', path: '/kernel/v1/books' },
		{ method: 'PUT', path: '/kernel/v1/books/:slug' },
		{ method: 'DELETE', path: '/kernel/v1/books/:slug' },
	];
}

function buildCacheKeys() {
	return {
		list: { segments: ['list'] as const },
		get: { segments: ['get'] as const },
		create: { segments: ['create'] as const },
		update: { segments: ['update'] as const },
		remove: { segments: ['remove'] as const },
	};
}
