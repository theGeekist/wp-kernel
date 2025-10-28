import { buildRestRoute } from '../route';
import type { RestRouteConfig } from '../types';
import {
	buildReturn,
	buildScalarString,
	type PhpStmtClassMethod,
} from '@wpkernel/php-json-ast';

function extractDocText(method: PhpStmtClassMethod): string {
	const comments = method.attributes?.comments as
		| readonly { readonly text?: string }[]
		| undefined;

	return comments?.[0]?.text ?? '';
}

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
			usesIdentity: true,
			statements: [buildReturn(buildScalarString('ok'))],
		};

		const method = buildRestRoute(config, { type: 'number', param: 'id' });

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

	it('omits identity plumbing when the route does not reference the controller identity', () => {
		const config: RestRouteConfig = {
			methodName: 'list_items',
			metadata: {
				method: 'GET',
				path: '/jobs',
				kind: 'list',
			},
			statements: [buildReturn(buildScalarString('ok'))],
		};

		const method = buildRestRoute(config, { type: 'number', param: 'id' });

		expect(method.stmts).toHaveLength(1);
		expect(method.stmts?.[0]).toMatchObject({
			nodeType: 'Stmt_Return',
			expr: expect.objectContaining({
				nodeType: 'Scalar_String',
				value: 'ok',
			}),
		});
	});

	it('injects request parameter assignments before route statements', () => {
		const config: RestRouteConfig = {
			methodName: 'list_items',
			metadata: {
				method: 'GET',
				path: '/jobs',
				kind: 'list',
			},
			usesIdentity: true,
			requestParameters: [
				{ param: 'page', targetVariable: 'page', cast: 'int' },
				{
					requestVariable: '$altRequest',
					param: 'status',
					targetVariable: 'status',
				},
			],
			statements: [buildReturn(buildScalarString('ok'))],
		};

		const method = buildRestRoute(config, { type: 'number', param: 'id' });

		expect(method.stmts).toHaveLength(5);
		expect(method.stmts?.[0]).toMatchObject({
			expr: expect.objectContaining({
				nodeType: 'Expr_Assign',
				expr: expect.objectContaining({
					nodeType: 'Expr_Cast_Int',
				}),
			}),
		});
		expect(method.stmts?.[1]).toMatchObject({
			expr: expect.objectContaining({
				var: expect.objectContaining({
					name: 'page',
				}),
			}),
		});
		expect(method.stmts?.[2]).toMatchObject({
			expr: expect.objectContaining({
				var: expect.objectContaining({
					name: 'status',
				}),
				expr: expect.objectContaining({
					nodeType: 'Expr_MethodCall',
					var: expect.objectContaining({
						name: 'altRequest',
					}),
				}),
			}),
		});
		expect(method.stmts?.[3]).toMatchObject({ nodeType: 'Stmt_Nop' });
	});

	it('builds docblocks with summaries and sorted metadata tags', () => {
		const config: RestRouteConfig = {
			methodName: 'create_item',
			metadata: {
				method: 'POST',
				path: '/jobs',
				kind: 'create',
				tags: {
					'channel:event': 'created',
					'action:source': 'rest',
				},
			},
			docblockSummary: 'Create a new job.',
			statements: [buildReturn(buildScalarString('ok'))],
		};

		const method = buildRestRoute(config, {
			type: 'string',
			param: 'slug',
		});
		const doc = extractDocText(method);

		expect(doc).toContain('Create a new job.');
		expect(doc).toContain('@wp-kernel route-kind create');
		expect(doc).toContain('@wp-kernel action:source rest');
		expect(doc).toContain('@wp-kernel channel:event created');
		expect(doc.indexOf('@wp-kernel action:source rest')).toBeLessThan(
			doc.indexOf('@wp-kernel channel:event created')
		);
	});

	it('falls back to a default summary when one is not provided', () => {
		const config: RestRouteConfig = {
			methodName: 'update_item',
			metadata: {
				method: 'PATCH',
				path: '/jobs/(?P<id>\\d+)',
				kind: 'update',
			},
			statements: [buildReturn(buildScalarString('ok'))],
		};

		const method = buildRestRoute(config, { type: 'number', param: 'id' });
		const doc = extractDocText(method);

		expect(doc).toContain('Handle [PATCH] /jobs/(?P<id>\\d+).');
	});
});
