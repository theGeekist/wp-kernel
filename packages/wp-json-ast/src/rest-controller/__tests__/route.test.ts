import { buildRestRoute } from '../route';
import type { RestRouteConfig } from '../types';
import { buildReturn, buildScalarString } from '@wpkernel/php-json-ast';

describe('buildRestRoute', () => {
	it('creates route methods with request param guards and policy enforcement', () => {
		const config: RestRouteConfig = {
			methodName: 'get_item',
			metadata: {
				method: 'GET',
				path: '/jobs/(?P<id>\\d+)',
				kind: 'get',
			},
			policy: 'job.read',
			requestParameters: [
				{
					param: 'id',
					cast: 'int',
				},
			],
			statements: [buildReturn(buildScalarString('ok'))],
		};

		const method = buildRestRoute(config);

		expect(method.params?.[0]).toMatchObject({
			type: expect.objectContaining({
				nodeType: 'Name',
				parts: ['WP_REST_Request'],
			}),
		});

		expect(method.stmts?.[0]).toMatchObject({
			nodeType: 'Stmt_Expression',
			expr: expect.objectContaining({
				nodeType: 'Expr_Assign',
				var: expect.objectContaining({
					nodeType: 'Expr_Variable',
					name: 'id',
				}),
				expr: expect.objectContaining({
					nodeType: 'Expr_Cast_Int',
				}),
			}),
		});

		expect(method.stmts?.[2]).toMatchObject({
			nodeType: 'Stmt_Expression',
			expr: expect.objectContaining({
				nodeType: 'Expr_Assign',
				var: expect.objectContaining({
					nodeType: 'Expr_Variable',
					name: 'permission',
				}),
			}),
		});

		expect(method.stmts?.[3]).toMatchObject({
			nodeType: 'Stmt_If',
			cond: expect.objectContaining({
				nodeType: 'Expr_FuncCall',
				name: expect.objectContaining({
					parts: ['is_wp_error'],
				}),
			}),
		});

		expect(method.stmts?.[5]).toMatchObject({
			nodeType: 'Stmt_Return',
			expr: expect.objectContaining({
				nodeType: 'Scalar_String',
				value: 'ok',
			}),
		});
	});
});
