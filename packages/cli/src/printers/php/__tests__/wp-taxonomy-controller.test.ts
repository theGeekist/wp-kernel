import { PhpFileBuilder } from '../builder';
import { createRouteHandlers } from '../routes';
import type { IRResource, IRRoute } from '../../../ir';
import type { PrinterContext } from '../../types';

describe('createRouteHandlers – wp-taxonomy storage', () => {
	it('generates CRUD handlers for taxonomy resources', () => {
		const builder = new PhpFileBuilder('Demo\\Namespace\\Rest', {
			kind: 'resource-controller',
			name: 'job-category',
		});

		const resource: IRResource = {
			name: 'jobCategory',
			schemaKey: 'jobCategory',
			schemaProvenance: 'manual',
			routes: [],
			cacheKeys: {} as IRResource['cacheKeys'],
			identity: { type: 'string', param: 'slug' },
			storage: {
				mode: 'wp-taxonomy',
				taxonomy: 'job_category',
				hierarchical: true,
			},
			queryParams: undefined,
			ui: undefined,
			hash: 'resource-jobCategory',
			warnings: [],
		} as unknown as IRResource;

		const routes: IRRoute[] = [
			{
				method: 'GET',
				path: '/jobs/categories',
				transport: 'local',
				hash: 'route-1',
			},
			{
				method: 'GET',
				path: '/jobs/categories/:slug',
				transport: 'local',
				hash: 'route-2',
			},
			{
				method: 'POST',
				path: '/jobs/categories',
				transport: 'local',
				hash: 'route-3',
			},
			{
				method: 'PUT',
				path: '/jobs/categories/:slug',
				transport: 'local',
				hash: 'route-4',
			},
			{
				method: 'DELETE',
				path: '/jobs/categories/:slug',
				transport: 'local',
				hash: 'route-5',
			},
		] as IRRoute[];

		const context = createPrinterContext();

		const methods = createRouteHandlers({
			builder,
			context,
			resource,
			routes,
		});

		for (const method of methods) {
			for (const line of method) {
				builder.appendStatement(line);
			}
		}

		const output = builder.getStatements().join('\n');

		expect(output).toContain('new WP_Term_Query');
		expect(output).toContain('wp_insert_term');
		expect(output).toContain('wp_update_term');
		expect(output).toContain('wp_delete_term');
		expect(output).toContain('prepareJobCategoryTermResponse');
		expect(output).toContain(
			"return new WP_Error( 'wpk_job_category_not_found'"
		);
		expect(builder.toAst().uses).toEqual([
			'WP_Error',
			'WP_REST_Request',
			'WP_Term',
			'WP_Term_Query',
		]);
	});
});

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
