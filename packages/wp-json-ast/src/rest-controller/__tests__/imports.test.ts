import {
	buildAssign,
	buildClassMethod,
	buildExpressionStatement,
	buildIdentifier,
	buildName,
	buildNew,
	buildParam,
	buildScalarString,
	buildVariable,
	PHP_METHOD_MODIFIER_PRIVATE,
	type PhpStmtClassMethod,
} from '@wpkernel/php-json-ast';

import { deriveRestControllerImports } from '../imports';
import type { RestRouteConfig } from '../types';

describe('deriveRestControllerImports', () => {
	it('collects imports referenced by routes and helper methods', () => {
		const route: RestRouteConfig = {
			methodName: 'get_items',
			metadata: {
				method: 'GET',
				path: '/demo/v1/items',
				kind: 'list',
			},
			capability: 'demo.read',
			statements: [
				buildExpressionStatement(
					buildAssign(
						buildVariable('post'),
						buildNew(buildName(['WP_Post']))
					)
				),
				buildExpressionStatement(
					buildAssign(
						buildVariable('query'),
						buildNew(buildName(['WP_Query']))
					)
				),
			],
		};

		const helper: PhpStmtClassMethod = buildClassMethod(
			buildIdentifier('prepareTerm'),
			{
				flags: PHP_METHOD_MODIFIER_PRIVATE,
				params: [
					buildParam(buildVariable('term'), {
						type: buildName(['WP_Term']),
					}),
				],
				stmts: [
					buildExpressionStatement(
						buildAssign(
							buildVariable('name'),
							buildScalarString('term')
						)
					),
				],
			}
		);

		const imports = deriveRestControllerImports([route], {
			capabilityClass: 'Demo\\Plugin\\Capability\\Capability',
			helperMethods: [helper],
		});

		expect([...imports]).toEqual(
			expect.arrayContaining([
				'WP_Error',
				'WP_REST_Request',
				'function is_wp_error',
				'Demo\\Plugin\\Capability\\Capability',
				'WP_Post',
				'WP_Query',
				'WP_Term',
			])
		);
	});
});
