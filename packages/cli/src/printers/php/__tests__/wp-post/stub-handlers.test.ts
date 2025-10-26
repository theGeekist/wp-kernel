import { PhpFileBuilder } from '../../builder';
import type { IRResource } from '../../../../ir';
import { createWpPostHandlers } from '../../wp-post';
import {
	createPrinterContext,
	createRouteDefinitions,
	createRoutes,
} from '../../test-utils/wp-post';

describe('createWpPostHandlers - stub handlers', () => {
	it('generates stub handlers for unsupported route kinds', () => {
		const builder = new PhpFileBuilder('Demo\\Namespace\\Rest', {
			kind: 'resource-controller',
			name: 'job',
		});

		const resource: IRResource = {
			name: 'job',
			schemaKey: 'job',
			schemaProvenance: 'manual',
			routes: createRoutes([
				['OPTIONS', '/jobs/stats'],
				['OPTIONS', '/jobs/:slug/publish'],
			]),
			cacheKeys: {},
			identity: { type: 'string', param: 'slug' },
			storage: {
				mode: 'wp-post',
				postType: 'demo_job',
			},
			queryParams: {},
			ui: undefined,
			hash: 'resource-job',
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
			'// TODO: Implement handler for [OPTIONS] /jobs/stats.'
		);
		expect(output).toContain(
			'// TODO: Implement handler for [OPTIONS] /jobs/:slug/publish.'
		);
		expect(output).toContain("$slug = $request->get_param( 'slug' );");
		expect(output).toContain(
			"return new WP_Error( 501, 'Not Implemented' );"
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

		const output = methods.flat().join('\n');
		expect(output).toContain(
			'public function optionsJobs( WP_REST_Request $request )'
		);
		expect(output).toContain(
			'// TODO: Implement handler for [OPTIONS] /jobs.'
		);
		expect(output).toContain(
			"return new WP_Error( 501, 'Not Implemented' );"
		);
		expect(output).toContain('private function getJobPostType(): string');
	});

	it('emits stubs for custom CRUD-like routes', () => {
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
				['GET', '/jobs/stats'],
				['POST', '/jobs/:slug/publish'],
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
			},
			queryParams: {},
			ui: undefined,
			hash: 'resource-job',
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
			'// TODO: Implement handler for [GET] /jobs/stats.'
		);
		expect(output).toContain(
			'// TODO: Implement handler for [POST] /jobs/:slug/publish.'
		);
		expect(output).not.toContain(
			'// TODO: Implement handler for [GET] /jobs.'
		);
		expect(output).toContain(
			'public function getJobs( WP_REST_Request $request )'
		);
	});

	it('returns stubs when canonical base paths cannot be resolved', () => {
		const builder = new PhpFileBuilder('Demo\\Namespace\\Rest', {
			kind: 'resource-controller',
			name: 'job',
		});

		const resource: IRResource = {
			name: 'job',
			schemaKey: 'job',
			schemaProvenance: 'manual',
			routes: createRoutes([['POST', '/jobs/:slug/publish']]),
			cacheKeys: {},
			identity: { type: 'string', param: 'slug' },
			storage: {
				mode: 'wp-post',
				postType: 'demo_job',
			},
			queryParams: {},
			ui: undefined,
			hash: 'resource-job-publish',
			warnings: [],
		} as unknown as IRResource;

		const context = createPrinterContext();
		const methods = createWpPostHandlers({
			builder,
			context,
			resource,
			routes: createRouteDefinitions(resource.routes, context),
		});

		const output = methods.flat().join('\n');
		expect(output).toContain(
			'// TODO: Implement handler for [POST] /jobs/:slug/publish.'
		);
	});

	it('treats nested dynamic identity routes as unsupported', () => {
		const builder = new PhpFileBuilder('Demo\\Namespace\\Rest', {
			kind: 'resource-controller',
			name: 'job',
		});

		const resource: IRResource = {
			name: 'job',
			schemaKey: 'job',
			schemaProvenance: 'manual',
			routes: createRoutes([
				['GET', '/companies/:companyId/jobs/:jobId'],
			]),
			cacheKeys: {},
			identity: { type: 'string', param: 'jobId' },
			storage: {
				mode: 'wp-post',
				postType: 'demo_job',
			},
			queryParams: {},
			ui: undefined,
			hash: 'resource-job-nested',
			warnings: [],
		} as unknown as IRResource;

		const context = createPrinterContext();
		const methods = createWpPostHandlers({
			builder,
			context,
			resource,
			routes: createRouteDefinitions(resource.routes, context),
		});

		const output = methods.flat().join('\n');
		expect(output).toContain(
			'// TODO: Implement handler for [GET] /companies/:companyId/jobs/:jobId.'
		);
	});
});
