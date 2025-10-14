import { PhpFileBuilder } from '../builder';
import { createRouteHandlers } from '../routes';
import type { IRResource, IRRoute } from '../../../ir';
import type { PrinterContext } from '../../types';

describe('createRouteHandlers – transient storage', () => {
	it('generates transient get and set handlers', () => {
		const builder = new PhpFileBuilder('Demo\\Namespace\\Rest', {
			kind: 'resource-controller',
			name: 'job-cache',
		});

		const resource: IRResource = {
			name: 'jobCache',
			schemaKey: 'jobCache',
			schemaProvenance: 'manual',
			routes: [],
			cacheKeys: {} as IRResource['cacheKeys'],
			storage: { mode: 'transient' },
			queryParams: undefined,
			ui: undefined,
			hash: 'resource-jobCache',
			warnings: [],
		} as unknown as IRResource;

		const routes: IRRoute[] = [
			{
				method: 'GET',
				path: '/jobs/cache',
				transport: 'local',
				hash: 'route-1',
			},
			{
				method: 'POST',
				path: '/jobs/cache',
				transport: 'local',
				hash: 'route-2',
			},
			{
				method: 'DELETE',
				path: '/jobs/cache',
				transport: 'local',
				hash: 'route-3',
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

		expect(output).toContain('get_transient');
		expect(output).toContain('set_transient');
		expect(output).toContain('normaliseJobCacheExpiration');
		expect(output).toContain(
			"return new WP_Error( 'wpk_job_cache_unsupported_operation'"
		);
		expect(builder.toAst().uses).toEqual(['WP_Error', 'WP_REST_Request']);
	});
});

function createPrinterContext(): PrinterContext {
	return {
		ir: {
			meta: {
				namespace: 'DemoNamespace',
				sanitizedNamespace: 'DemoNamespace',
			},
			policyMap: {
				sourcePath: undefined,
				definitions: [],
				fallback: {
					capability: 'manage_options',
					appliesTo: 'resource',
				},
				missing: [],
				unused: [],
				warnings: [],
			},
		},
	} as unknown as PrinterContext;
}
