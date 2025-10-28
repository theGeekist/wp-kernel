import { buildPersistenceRegistryModule } from '../module';
import type { PersistenceRegistryModuleConfig } from '../types';

type PhpArrayItem = { key?: { value: string }; value: any };
type PhpArrayNode = {
	key?: { value: string };
	value: { items: PhpArrayItem[] };
};

describe('buildPersistenceRegistryModule', () => {
	it('emits a persistence registry program with storage and identity payloads', () => {
		const config: PersistenceRegistryModuleConfig = {
			origin: 'wpk.config.ts',
			namespace: 'Demo\\Plugin\\Registration',
			resources: [
				{
					name: 'post',
					storage: {
						mode: 'wp-post',
						postType: 'demo_post',
						statuses: ['publish', 'draft'],
					},
					identity: { type: 'number', param: 'id' },
				},
				{
					name: 'option',
					storage: { mode: 'wp-option', option: 'demo_option' },
				},
				{
					name: 'no-persistence',
				},
			],
		};

		const result = buildPersistenceRegistryModule(config);
		expect(result.files).toHaveLength(1);

		const file = result.files[0];
		expect(file).toBeDefined();
		if (!file) {
			throw new Error(
				'Expected persistence registry module to emit a file.'
			);
		}

		expect(file.fileName).toBe('Registration/PersistenceRegistry.php');
		expect(file.metadata).toEqual({ kind: 'persistence-registry' });
		expect(file.docblock).toEqual([
			'Source: wpk.config.ts → resources (storage + identity metadata)',
		]);
		expect(file.uses).toEqual([]);

		const [declareStmt, namespaceStmt] = file.program;
		expect(declareStmt).toMatchObject({ nodeType: 'Stmt_Declare' });
		expect(namespaceStmt).toMatchObject({
			nodeType: 'Stmt_Namespace',
			name: expect.objectContaining({
				parts: ['Demo', 'Plugin', 'Registration'],
			}),
		});

		const namespaceBody = (
			namespaceStmt as {
				stmts?: Array<{ nodeType?: string; name?: { name?: string } }>;
			}
		).stmts;
		const classStmt = namespaceBody?.find(
			(entry) => entry?.nodeType === 'Stmt_Class'
		) as {
			stmts?: Array<{
				nodeType?: string;
				name?: { name?: string };
				stmts?: any[];
			}>;
		};

		const getConfig = classStmt?.stmts?.find(
			(stmt) =>
				stmt?.nodeType === 'Stmt_ClassMethod' &&
				stmt?.name?.name === 'get_config'
		) as { stmts?: Array<{ nodeType?: string; expr?: any }> };

		const returnStmt = getConfig?.stmts?.find(
			(stmt) => stmt?.nodeType === 'Stmt_Return'
		);

		const payloadItems = returnStmt?.expr?.items as PhpArrayNode[];

		const resourcesEntry = payloadItems?.find(
			(item: PhpArrayNode) => item.key?.value === 'resources'
		);
		expect(resourcesEntry?.value?.items).toHaveLength(2);

		const postEntry = resourcesEntry?.value?.items.find(
			(item: PhpArrayItem) => item.key?.value === 'post'
		);
		const optionEntry = resourcesEntry?.value?.items.find(
			(item: PhpArrayItem) => item.key?.value === 'option'
		);

		expect(
			postEntry?.value?.items?.map(
				(item: PhpArrayItem) => item.key?.value
			)
		).toEqual(['identity', 'storage']);
		const storageItem = postEntry?.value?.items?.find(
			(item: PhpArrayItem) => item.key?.value === 'storage'
		);
		const statusesItem = storageItem?.value?.items?.find(
			(item: PhpArrayItem) => item.key?.value === 'statuses'
		);
		expect(
			statusesItem?.value?.items?.map(
				(item: PhpArrayItem) => item.value?.value
			)
		).toEqual(['publish', 'draft']);

		const optionMode = optionEntry?.value?.items
			?.find((item: PhpArrayItem) => item.key?.value === 'storage')
			?.value?.items?.find(
				(item: PhpArrayItem) => item.key?.value === 'mode'
			);
		expect(optionMode?.value).toMatchObject({
			nodeType: 'Scalar_String',
			value: 'wp-option',
		});
	});
});
