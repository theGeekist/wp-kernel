import { PhpFileBuilder } from '../../builder';
import type { IRResource } from '../../../../ir';
import { createWpPostHandlers } from '../../wp-post';
import {
	createPrinterContext,
	createRouteDefinitions,
	createRoutes,
} from '../../test-utils/wp-post';

describe('createWpPostHandlers – identity behaviour', () => {
	it('provides uuid identity fallbacks when resolving posts', () => {
		const builder = new PhpFileBuilder('Demo\\Namespace\\Rest', {
			kind: 'resource-controller',
			name: 'application',
		});

		const resource: IRResource = {
			name: 'application',
			schemaKey: 'application',
			schemaProvenance: 'manual',
			routes: createRoutes([['GET', '/applications/:uuid']]),
			cacheKeys: {
				list: {
					segments: Object.freeze(['application', 'list']),
					source: 'config',
				},
				get: {
					segments: Object.freeze([
						'application',
						'get',
						'__wpk_id__',
					]),
					source: 'default',
				},
				create: {
					segments: Object.freeze(['application', 'create']),
					source: 'config',
				},
				update: {
					segments: Object.freeze(['application', 'update']),
					source: 'config',
				},
				remove: {
					segments: Object.freeze(['application', 'remove']),
					source: 'config',
				},
			},
			identity: { type: 'string', param: 'uuid' },
			storage: {
				mode: 'wp-post',
				postType: 'demo_application',
			},
			queryParams: {},
			ui: undefined,
			hash: 'resource-application',
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
		expect(output).toContain("'meta_key' => 'uuid'");
		expect(output).toContain(
			'get_page_by_path( $candidate, OBJECT, $post_type )'
		);
	});

	it('falls back to default identifiers and post types when omitted', () => {
		const builder = new PhpFileBuilder('Demo\\Namespace\\Rest', {
			kind: 'resource-controller',
			name: 'announcement',
		});

		const resource: IRResource = {
			name: 'announcement',
			schemaKey: 'announcement',
			schemaProvenance: 'manual',
			routes: createRoutes([
				['POST', '/announcements'],
				['GET', '/announcements/:slug'],
				['PUT', '/announcements/:slug'],
			]),
			cacheKeys: {
				list: {
					segments: Object.freeze(['announcement', 'list']),
					source: 'config',
				},
				get: {
					segments: Object.freeze([
						'announcement',
						'get',
						'__wpk_id__',
					]),
					source: 'default',
				},
				create: {
					segments: Object.freeze(['announcement', 'create']),
					source: 'config',
				},
				update: {
					segments: Object.freeze(['announcement', 'update']),
					source: 'config',
				},
				remove: {
					segments: Object.freeze(['announcement', 'remove']),
					source: 'config',
				},
			},
			identity: { type: 'string' },
			storage: {
				mode: 'wp-post',
				supports: [],
			},
			queryParams: {},
			ui: undefined,
			hash: 'resource-announcement',
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
		expect(output).toContain("$request->get_param( 'slug' )");
		expect(output).toContain("return 'announcement';");
		expect(output).not.toContain('post_title');
	});

	it('defaults numeric identity params when not provided', () => {
		const builder = new PhpFileBuilder('Demo\\Namespace\\Rest', {
			kind: 'resource-controller',
			name: 'slot',
		});

		const resource: IRResource = {
			name: 'slot',
			schemaKey: 'slot',
			schemaProvenance: 'manual',
			routes: createRoutes([
				['GET', '/slots/:id'],
				['DELETE', '/slots/:id'],
			]),
			cacheKeys: {
				list: {
					segments: Object.freeze(['slot', 'list']),
					source: 'config',
				},
				get: {
					segments: Object.freeze(['slot', 'get', '__wpk_id__']),
					source: 'default',
				},
				create: {
					segments: Object.freeze(['slot', 'create']),
					source: 'config',
				},
				update: {
					segments: Object.freeze(['slot', 'update']),
					source: 'config',
				},
				remove: {
					segments: Object.freeze(['slot', 'remove']),
					source: 'config',
				},
			},
			identity: { type: 'number' },
			storage: {
				mode: 'wp-post',
				postType: 'demo_slot',
			},
			queryParams: {},
			ui: undefined,
			hash: 'resource-slot',
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
		expect(output).toContain("$request->get_param( 'id' )");
		expect(output).toContain("'id' => (int) $post->ID");
	});
});
