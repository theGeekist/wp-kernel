import { createResourceControllerArtifact } from '../resource-controller';
import type { PrinterContext } from '../../types';
import type { IRResource, IRRoute } from '../../../ir';

const namespaceRoot = 'Demo\\Namespace';

describe('createResourceControllerArtifact', () => {
	it('builds a controller with docblocks and methods', () => {
		const context = createPrinterContext();
		const resource = createResource();
		const routes: IRRoute[] = [
			{ method: 'GET', path: '/jobs', transport: 'local' } as IRRoute,
		];

		const { builder, className } = createResourceControllerArtifact(
			namespaceRoot,
			resource,
			routes,
			context
		);

		expect(className).toBe('JobController');

		const ast = builder.toAst();
		expect(ast.docblock).toContain('Source: local-file.ts → resources.job');
		expect(ast.statements[0]).toBe(
			'class JobController extends BaseController'
		);
		expect(ast.statements).toContain("                return 'job';");
		expect(ast.statements).toContain(
			"                return 'job-schema';"
		);
	});
});

function createPrinterContext(): PrinterContext {
	return {
		ir: {
			meta: {
				origin: 'local-file.ts',
				namespace: 'DemoNamespace',
				sanitizedNamespace: 'DemoNamespace',
			},
			php: { namespace: namespaceRoot },
			schemas: [
				{
					key: 'job-schema',
					schema: {
						type: 'object',
						properties: { name: { type: 'string' } },
					},
					source: 'config',
				},
			],
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

function createResource(): IRResource {
	return {
		name: 'job',
		schemaKey: 'job-schema',
		schemaProvenance: 'config',
		routes: [],
		cacheKeys: {},
		identity: undefined,
		storage: undefined,
		queryParams: undefined,
		ui: undefined,
		hash: 'resource-job',
		warnings: [],
	} as unknown as IRResource;
}
