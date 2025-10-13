import { createPersistenceRegistryBuilder } from '../persistence-registry';
import type { PrinterContext } from '../../types';
import type { IRResource } from '../../../ir';

const namespaceRoot = 'Demo\\Namespace';

describe('createPersistenceRegistryBuilder', () => {
	it('renders storage and identity metadata', () => {
		const context = createPrinterContext();
		const builder = createPersistenceRegistryBuilder(
			namespaceRoot,
			context
		);

		const ast = builder.toAst();
		expect(ast.docblock).toContain(
			'Source: local-file.ts → resources (storage + identity metadata)'
		);
		expect(ast.statements.join('\n')).toContain("'postType' => 'job'");
		expect(ast.statements.join('\n')).toContain("'param' => 'id'");
	});
});

function createPrinterContext(): PrinterContext {
	const resources: IRResource[] = [
		{
			name: 'job',
			schemaKey: 'job',
			schemaProvenance: 'config',
			routes: [],
			cacheKeys: {},
			identity: { type: 'number', param: 'id' },
			storage: { mode: 'wp-post', postType: 'job' },
			queryParams: undefined,
			ui: undefined,
			hash: 'resource-job',
			warnings: [],
		} as unknown as IRResource,
	];

	return {
		ir: {
			meta: {
				origin: 'local-file.ts',
				namespace: 'DemoNamespace',
				sanitizedNamespace: 'DemoNamespace',
			},
			php: { namespace: namespaceRoot },
			schemas: [],
			resources,
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
