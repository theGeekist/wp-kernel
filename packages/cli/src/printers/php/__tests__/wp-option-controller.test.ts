import { PhpFileBuilder } from '../builder';
import { createRouteHandlers } from '../routes';
import type { IRResource, IRRoute } from '../../../ir';
import type { PrinterContext } from '../../types';

describe('createRouteHandlers - wp-option storage', () => {
	it('creates getters and setters for option-backed resources', () => {
		const builder = new PhpFileBuilder('Demo\\Namespace\\Rest', {
			kind: 'resource-controller',
			name: 'job-settings',
		});

		const resource: IRResource = {
			name: 'jobSettings',
			schemaKey: 'jobSettings',
			schemaProvenance: 'manual',
			routes: [],
			cacheKeys: {} as IRResource['cacheKeys'],
			storage: {
				mode: 'wp-option',
				option: 'job_settings',
			},
			queryParams: undefined,
			ui: undefined,
			hash: 'resource-jobSettings',
			warnings: [],
		} as unknown as IRResource;

		const routes: IRRoute[] = [
			{
				method: 'GET',
				path: '/jobs/settings',
				transport: 'local',
				hash: 'route-1',
			},
			{
				method: 'PUT',
				path: '/jobs/settings',
				transport: 'local',
				hash: 'route-2',
			},
			{
				method: 'DELETE',
				path: '/jobs/settings',
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

		expect(output).toContain('get_option');
		expect(output).toContain('update_option');
		expect(output).toContain('normaliseJobSettingsAutoload');
		expect(output).toContain(
			"return new WP_Error( 'wpk_job_settings_unsupported_operation'"
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
