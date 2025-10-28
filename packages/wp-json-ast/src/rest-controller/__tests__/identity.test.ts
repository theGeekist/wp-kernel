import { buildIdentityPlumbing } from '../identity';
import type { RestRouteConfig } from '../types';

function createRouteConfig(): RestRouteConfig {
	return {
		methodName: 'get_item',
		metadata: {
			method: 'GET',
			path: '/jobs/(?P<id>\\d+)',
			kind: 'get',
		},
		statements: [],
	};
}

describe('buildIdentityPlumbing', () => {
	it('emits a casted assignment when the route references a numeric identity', () => {
		const route: RestRouteConfig = {
			...createRouteConfig(),
			usesIdentity: true,
		};

		const [assignment] = buildIdentityPlumbing({
			identity: { type: 'number', param: 'id' },
			route,
		});

		expect(assignment).toMatchObject({
			nodeType: 'Stmt_Expression',
			expr: expect.objectContaining({
				nodeType: 'Expr_Assign',
				expr: expect.objectContaining({
					nodeType: 'Expr_Cast_Int',
				}),
			}),
		});
	});

	it('avoids casting when the identity is a string', () => {
		const route: RestRouteConfig = {
			...createRouteConfig(),
			usesIdentity: true,
		};

		const [assignment] = buildIdentityPlumbing({
			identity: { type: 'string', param: 'slug' },
			route,
		});

		expect(assignment).toMatchObject({
			nodeType: 'Stmt_Expression',
			expr: expect.objectContaining({
				expr: expect.objectContaining({
					nodeType: 'Expr_MethodCall',
				}),
			}),
		});
	});

	it('returns no statements when the route does not use the identity', () => {
		const route = createRouteConfig();

		const statements = buildIdentityPlumbing({
			identity: { type: 'number', param: 'id' },
			route,
		});

		expect(statements).toHaveLength(0);
	});
});
