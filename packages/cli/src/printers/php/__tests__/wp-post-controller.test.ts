import { PhpFileBuilder } from '../builder';
import type { PrinterContext } from '../../types';
import type { IRResource, IRRoute } from '../../../ir';
import { createWpPostHandlers } from '../wp-post';

describe('createWpPostHandlers', () => {
	it('generates CRUD methods and helpers for wp-post resources', () => {
		const builder = new PhpFileBuilder('Demo\\Namespace\\Rest', {
			kind: 'resource-controller',
			name: 'job',
		});

		const resource: IRResource = {
			name: 'job',
			schemaKey: 'job',
			schemaProvenance: 'manual',
			routes: createRoutes([
				['GET', '/jobs'],
				['GET', '/jobs/:slug'],
				['POST', '/jobs'],
				['PUT', '/jobs/:slug'],
				['DELETE', '/jobs/:slug'],
			]),
			cacheKeys: {
				list: {
					segments: Object.freeze(['job', 'list']),
					source: 'config',
				},
				get: {
					segments: Object.freeze(['job', 'get', '__wpk_id__']),
					source: 'default',
				},
				create: {
					segments: Object.freeze(['job', 'create']),
					source: 'config',
				},
				update: {
					segments: Object.freeze(['job', 'update']),
					source: 'config',
				},
				remove: {
					segments: Object.freeze(['job', 'remove']),
					source: 'config',
				},
			},
			identity: { type: 'string', param: 'slug' },
			storage: {
				mode: 'wp-post',
				postType: 'demo_job',
				statuses: ['draft', 'published'],
				supports: ['title', 'editor'],
				meta: {
					status: { type: 'string', single: true },
					tags: { type: 'array', single: false },
				},
				taxonomies: {
					categories: { taxonomy: 'job_category' },
				},
			},
			queryParams: {
				search: {
					type: 'string',
					optional: true,
					description: 'Full text search',
				},
				status: { type: 'enum', enum: ['draft', 'published'] },
			},
			ui: undefined,
			hash: 'resource-job',
			warnings: [],
		} as unknown as IRResource;

		const context = {
			ir: {
				meta: {
					namespace: 'DemoNamespace',
					sanitizedNamespace: 'DemoNamespace',
				},
			},
		} as unknown as PrinterContext;

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

		expect(output).toContain('$meta_query = array();');
		expect(output).toContain('$query = new WP_Query( $query_args );');
		expect(output).toContain(
			'$post_id = wp_insert_post( $post_data, true );'
		);
		expect(output).toContain('$this->syncJobMeta( $post_id, $request );');
		expect(output).toContain(
			'$taxonomy_result = $this->syncJobTaxonomies( $post_id, $request );'
		);
		expect(output).toContain(
			'private function resolveJobPost( $identity ): ?WP_Post'
		);
		expect(output).toContain('private function getJobStatuses(): array');
		expect(output).toContain(
			'private function prepareJobResponse( WP_Post $post, WP_REST_Request $request ): array'
		);
		expect(output).toContain("return new WP_Error( 'wpk_job_not_found'");
		expect(output).toContain('$this->syncJobMeta( $post->ID, $request );');
		expect(output).toContain("'deleted' => true");
	});

	it('returns an empty result when storage mode is not wp-post', () => {
		const builder = new PhpFileBuilder('Demo\\Namespace\\Rest', {
			kind: 'resource-controller',
			name: 'job',
		});

		const resource = {
			name: 'job',
			routes: [],
			storage: { mode: 'wp-option' },
		} as unknown as IRResource;

		const context = createPrinterContext();
		const methods = createWpPostHandlers({
			builder,
			context,
			resource,
			routes: [],
		});

		expect(methods).toEqual([]);
	});

	it('supports numeric identities and complex meta sanitisation', () => {
		const builder = new PhpFileBuilder('Demo\\Namespace\\Rest', {
			kind: 'resource-controller',
			name: 'position',
		});

		const resource: IRResource = {
			name: 'position',
			schemaKey: 'position',
			schemaProvenance: 'manual',
			routes: createRoutes([
				['GET', '/positions'],
				['GET', '/positions/:id'],
				['POST', '/positions'],
				['PUT', '/positions/:id'],
				['DELETE', '/positions/:id'],
			]),
			cacheKeys: {
				list: {
					segments: Object.freeze(['position', 'list']),
					source: 'config',
				},
				get: {
					segments: Object.freeze(['position', 'get', '__wpk_id__']),
					source: 'default',
				},
				create: {
					segments: Object.freeze(['position', 'create']),
					source: 'config',
				},
				update: {
					segments: Object.freeze(['position', 'update']),
					source: 'config',
				},
				remove: {
					segments: Object.freeze(['position', 'remove']),
					source: 'config',
				},
			},
			identity: undefined,
			storage: {
				mode: 'wp-post',
				postType: 'demo_position',
				supports: ['title', 'editor', 'excerpt'],
				meta: {
					is_active: { type: 'boolean', single: true },
					priority: { type: 'integer', single: true },
					rating: { type: 'number', single: true },
					settings: { type: 'object', single: true },
					labels: { type: 'string', single: false },
				},
			},
			queryParams: {},
			ui: undefined,
			hash: 'resource-position',
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
		expect(output).toContain('rest_sanitize_boolean( $is_activeMeta )');
		expect(output).toContain(
			'is_numeric( $priorityMeta ) ? (int) $priorityMeta : 0;'
		);
		expect(output).toContain(
			'is_numeric( $ratingMeta ) ? (float) $ratingMeta : 0.0;'
		);
		expect(output).toContain(
			'is_array( $settingsMeta ) ? $settingsMeta : array();'
		);
		expect(output).toContain(
			'$labelsMeta = array_values( (array) $labelsMeta );'
		);
		expect(output).toContain("$post_data['post_excerpt'] = $excerpt;");
	});

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

	it('skips unsupported HTTP methods when creating handlers', () => {
		const builder = new PhpFileBuilder('Demo\\Namespace\\Rest', {
			kind: 'resource-controller',
			name: 'job',
		});

		const resource: IRResource = {
			name: 'job',
			schemaKey: 'job',
			schemaProvenance: 'manual',
			routes: createRoutes([['OPTIONS', '/jobs']]),
			cacheKeys: {
				list: {
					segments: Object.freeze(['job', 'list']),
					source: 'config',
				},
				get: {
					segments: Object.freeze(['job', 'get', '__wpk_id__']),
					source: 'default',
				},
				create: {
					segments: Object.freeze(['job', 'create']),
					source: 'config',
				},
				update: {
					segments: Object.freeze(['job', 'update']),
					source: 'config',
				},
				remove: {
					segments: Object.freeze(['job', 'remove']),
					source: 'config',
				},
			},
			identity: { type: 'string', param: 'slug' },
			storage: {
				mode: 'wp-post',
				postType: 'demo_job',
			},
			queryParams: {},
			ui: undefined,
			hash: 'resource-job-options',
			warnings: [],
		} as unknown as IRResource;

		const context = createPrinterContext();
		const methods = createWpPostHandlers({
			builder,
			context,
			resource,
			routes: createRouteDefinitions(resource.routes, context),
		});

		const flattened = methods.flat();
		expect(flattened.some((line) => line.includes('options'))).toBe(false);
		expect(flattened.join('\n')).toContain(
			'private function getJobPostType(): string'
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

function createRoutes(entries: Array<[IRRoute['method'], string]>): IRRoute[] {
	return entries.map(([method, path], index) => ({
		method,
		path,
		hash: `route-${index}`,
		transport: 'local',
	}));
}

function createPrinterContext(): PrinterContext {
	return {
		ir: {
			meta: {
				namespace: 'DemoNamespace',
				sanitizedNamespace: 'DemoNamespace',
			},
		},
	} as unknown as PrinterContext;
}

function createRouteDefinitions(
	routes: IRRoute[],
	context: PrinterContext
): Array<{
	route: IRRoute;
	methodName: string;
}> {
	return routes.map((route) => ({
		route,
		methodName: inferMethodName(route, context),
	}));
}

function inferMethodName(route: IRRoute, context: PrinterContext): string {
	const method = route.method.toLowerCase();
	const segments = route.path
		.replace(/^\/+/, '')
		.split('/')
		.filter(Boolean)
		.map((segment) => segment.replace(/^:/, ''));
	const suffix = segments
		.filter(
			(segment) =>
				segment.toLowerCase() !==
				context.ir.meta.sanitizedNamespace?.toLowerCase()
		)
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join('');
	return `${method}${suffix || 'Route'}`;
}
