import { PhpFileBuilder } from '../builder';
import type { PrinterContext } from '../../types';
import type { IRResource, IRRoute } from '../../../ir';
import { createRouteHandlers, createRouteMethodName } from '../routes';

describe('routes', () => {
	const context = createPrinterContext();

	it('creates stub handlers for non-wp-post routes', () => {
		const builder = new PhpFileBuilder('Demo\\Namespace\\Rest', {
			kind: 'resource-controller',
			name: 'job',
		});

		const resource = createResource();
		const routes: IRRoute[] = [
			{ method: 'GET', path: '/jobs', transport: 'local' } as IRRoute,
			{ method: 'POST', path: '/jobs', transport: 'local' } as IRRoute,
		];

		const methods = createRouteHandlers({
			builder,
			context,
			resource,
			routes,
		});

		expect(methods).toHaveLength(2);
		expect(methods[0]!.join('\n')).toContain('public function getJobs(');
		expect(builder.toAst().uses).toEqual(['WP_Error', 'WP_REST_Request']);
	});

	it('derives method names based on route paths', () => {
		const route: IRRoute = {
			method: 'DELETE',
			path: '/demo-namespace/v1/jobs/:id',
			transport: 'local',
		} as IRRoute;

		expect(createRouteMethodName(route, context)).toBe(
			'deleteDemoNamespaceV1JobsId'
		);
	});
});

function createResource(): IRResource {
	return {
		name: 'job',
		schemaKey: 'job',
		schemaProvenance: 'config',
		routes: [],
		cacheKeys: {},
		storage: undefined,
		identity: undefined,
		queryParams: undefined,
		ui: undefined,
		hash: 'resource-job',
		warnings: [],
	} as unknown as IRResource;
}

function createPrinterContext(): PrinterContext {
	return {
		ir: {
			meta: {
				origin: 'source-file.ts',
				namespace: 'DemoNamespace',
				sanitizedNamespace: 'DemoNamespace',
			},
			php: { namespace: 'DemoNamespace' },
			schemas: [],
			resources: [],
			config: {},
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
