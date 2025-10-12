import { PhpFileBuilder } from '../../builder';
import type { IRResource } from '../../../../ir';
import { createWpPostHandlers } from '../../wp-post';
import {
	createPrinterContext,
	createRouteDefinitions,
	createRoutes,
} from '../../test-utils/wp-post';

describe('createWpPostHandlers – route classification', () => {
	it('derives canonical base paths when routes use the root path', () => {
		const builder = new PhpFileBuilder('Demo\\Namespace\\Rest', {
			kind: 'resource-controller',
			name: 'landing',
		});

		const resource: IRResource = {
			name: 'landing',
			schemaKey: 'landing',
			schemaProvenance: 'manual',
			routes: createRoutes([
				['GET', '/'],
				['POST', '/'],
			]),
			cacheKeys: {
				list: {
					segments: Object.freeze(['landing', 'list']),
					source: 'config',
				},
				get: {
					segments: Object.freeze(['landing', 'get', '__wpk_id__']),
					source: 'default',
				},
				create: {
					segments: Object.freeze(['landing', 'create']),
					source: 'config',
				},
			},
			identity: { type: 'number', param: 'id' },
			storage: {
				mode: 'wp-post',
				postType: 'landing_page',
			},
			queryParams: {},
			ui: undefined,
			hash: 'resource-landing',
			warnings: [],
		} as unknown as IRResource;

		const context = createPrinterContext();
		const methods = createWpPostHandlers({
			builder,
			context,
			resource,
			routes: createRouteDefinitions(resource.routes, context),
		});

		for (const method of methods) {
			for (const line of method) {
				builder.appendStatement(line);
			}
		}

		const output = builder.getStatements().join('\n');
		expect(output).toContain(
			'public function getRoute( WP_REST_Request $request )'
		);
		expect(output).toContain(
			'public function postRoute( WP_REST_Request $request )'
		);
		expect(output).toContain('if ( is_numeric( $identity ) ) {');
		expect(output).not.toContain('// TODO: Implement handler for [GET] /.');
	});
});
