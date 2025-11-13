import {
	buildRouteMethodName,
	deriveRouteSegments,
} from '../controller.routeNames';
import type { IRRoute, IRv1 } from '../../../ir/publicTypes';

function createIr(overrides: Partial<IRv1['meta']> = {}): IRv1 {
	return {
		meta: {
			namespace: 'wpk/v1',
			sanitizedNamespace: 'wpk/v1',
			...overrides,
		},
	} as unknown as IRv1;
}

describe('controller route naming helpers', () => {
	it('builds semantic method names by removing namespace segments', () => {
		const ir = createIr();
		const route = {
			method: 'GET',
			path: '/wpk/v1/jobs/:jobId',
		} as IRRoute;

		expect(buildRouteMethodName(route, ir)).toBe('getJobsJobId');
	});

	it('falls back to Route suffix when no path segments exist', () => {
		const ir = createIr();
		const route = {
			method: 'POST',
			path: '/',
		} as IRRoute;

		expect(buildRouteMethodName(route, ir)).toBe('postRoute');
	});

	it('derives segments when namespace does not match', () => {
		const ir = createIr({
			namespace: 'other/v2',
			sanitizedNamespace: 'other/v2',
		});
		const segments = deriveRouteSegments('/wpk/v1/jobs/:id', ir);

		expect(segments).toEqual(['wpk', 'v1', 'jobs', 'id']);
	});
});
