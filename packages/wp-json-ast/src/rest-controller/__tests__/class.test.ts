import { buildRestControllerClass } from '../class';
import type { RestControllerClassConfig } from '../types';
import {
	buildClassMethod,
	buildIdentifier,
	buildName,
	buildParam,
	buildReturn,
	buildScalarString,
	buildVariable,
	PHP_METHOD_MODIFIER_PUBLIC,
	type PhpStmtClassMethod,
} from '@wpkernel/php-json-ast';

describe('buildRestControllerClass', () => {
	it('returns a class node with standard methods and collected imports', () => {
		const helperMethod = buildClassMethod(buildIdentifier('helper'), {
			flags: PHP_METHOD_MODIFIER_PUBLIC,
			params: [
				buildParam(buildVariable('post'), {
					type: buildName(['WP_Post']),
				}),
			],
			stmts: [buildReturn(buildScalarString('helper'))],
		});

		const config: RestControllerClassConfig = {
			className: 'JobController',
			resourceName: 'job',
			schemaKey: 'job',
			restArgsExpression: buildScalarString('args'),
			identity: { type: 'number', param: 'id' },
			routes: [
				{
					methodName: 'get_item',
					metadata: {
						method: 'GET',
						path: '/jobs/(?P<id>\\d+)',
						kind: 'get',
					},
					policy: 'job.read',
					statements: [],
				},
			],
			helperMethods: [helperMethod],
			policyClass: 'App\\Policy\\Policy',
		};

		const result = buildRestControllerClass(config);

		expect(result.classNode).toMatchObject({
			extends: expect.objectContaining({
				parts: ['BaseController'],
			}),
		});

		const methodNames = (result.classNode.stmts ?? [])
			.filter(
				(stmt): stmt is PhpStmtClassMethod =>
					stmt.nodeType === 'Stmt_ClassMethod'
			)
			.map((stmt) => stmt.name?.name);
		expect(methodNames).toEqual(
			expect.arrayContaining([
				'get_resource_name',
				'get_schema_key',
				'get_rest_args',
				'get_item',
				'helper',
			])
		);

		expect(result.uses).toEqual(
			expect.arrayContaining([
				'WP_Error',
				'WP_REST_Request',
				'function is_wp_error',
				'App\\Policy\\Policy',
				'WP_Post',
			])
		);
	});
});
