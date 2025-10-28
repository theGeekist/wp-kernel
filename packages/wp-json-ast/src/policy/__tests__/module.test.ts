import { buildPolicyModule } from '../module';
import type { PolicyModuleConfig } from '../types';

describe('buildPolicyModule', () => {
	it('emits a policy helper program with registrar methods and docblocks', () => {
		const config: PolicyModuleConfig = {
			origin: 'wpk.config.ts',
			namespace: 'Demo\\Plugin\\Policy',
			policyMap: {
				sourcePath: 'src/policy-map.ts',
				definitions: [
					{
						key: 'demo.create',
						capability: 'create_demo',
						appliesTo: 'resource',
						source: 'map',
					},
					{
						key: 'demo.update',
						capability: 'edit_demo',
						appliesTo: 'object',
						binding: 'id',
						source: 'map',
					},
				],
				fallback: {
					capability: 'manage_demo',
					appliesTo: 'resource',
				},
				missing: ['demo.delete'],
				unused: ['demo.view'],
				warnings: [
					{
						code: 'policy-map.binding.missing',
						message: 'Binding missing for policy.',
						context: { policy: 'demo.update' },
					},
				],
			},
		};

		const result = buildPolicyModule(config);
		expect(result.files).toHaveLength(1);

		const file = result.files[0];
		expect(file).toBeDefined();
		if (!file) {
			throw new Error('Expected policy module to emit a file.');
		}

		expect(file.fileName).toBe('Policy/Policy.php');
		expect(file.metadata).toEqual({
			kind: 'policy-helper',
			map: {
				sourcePath: 'src/policy-map.ts',
				fallback: {
					capability: 'manage_demo',
					appliesTo: 'resource',
				},
				definitions: [
					{
						key: 'demo.create',
						capability: 'create_demo',
						appliesTo: 'resource',
						binding: undefined,
						source: 'map',
					},
					{
						key: 'demo.update',
						capability: 'edit_demo',
						appliesTo: 'object',
						binding: 'id',
						source: 'map',
					},
				],
				missing: ['demo.delete'],
				unused: ['demo.view'],
				warnings: [
					{
						code: 'policy-map.binding.missing',
						message: 'Binding missing for policy.',
						context: { policy: 'demo.update' },
					},
				],
			},
		});
		expect(file.docblock).toEqual([
			'Source: wpk.config.ts → policy-map (src/policy-map.ts)',
		]);
		expect(file.uses).toEqual(['WP_Error', 'WP_REST_Request']);

		const [declareStmt, namespaceStmt] = file.program;
		expect(declareStmt).toMatchObject({ nodeType: 'Stmt_Declare' });
		expect(namespaceStmt).toMatchObject({
			nodeType: 'Stmt_Namespace',
			name: expect.objectContaining({
				parts: ['Demo', 'Plugin', 'Policy'],
			}),
		});

		const namespaceBody = (
			namespaceStmt as {
				stmts?: unknown[];
			}
		).stmts as Array<{ nodeType?: string }> | undefined;
		expect(namespaceBody?.[0]).toMatchObject({ nodeType: 'Stmt_Use' });
		expect(namespaceBody?.[1]).toMatchObject({ nodeType: 'Stmt_Use' });
		const classStmt = namespaceBody?.find(
			(entry) => entry?.nodeType === 'Stmt_Class'
		) as { stmts?: any[] } | undefined;
		expect(classStmt?.stmts?.map((stmt) => stmt.name.name)).toEqual([
			'policy_map',
			'fallback',
			'callback',
			'enforce',
			'get_definition',
			'get_binding',
			'create_error',
		]);

		const policyMapMethod = classStmt?.stmts?.find(
			(stmt: any) =>
				stmt?.nodeType === 'Stmt_ClassMethod' &&
				stmt?.name?.name === 'policy_map'
		) as { stmts?: any[] } | undefined;
		const returnStmt = policyMapMethod?.stmts?.find(
			(stmt: any) => stmt?.nodeType === 'Stmt_Return'
		) as { expr?: any } | undefined;

		const entries = returnStmt?.expr?.items as Array<{
			key: { value: string };
			value: { items: Array<{ key?: { value: string }; value: any }> };
		}>;
		expect(entries?.map((entry) => entry.key.value)).toEqual([
			'demo.create',
			'demo.update',
		]);
		const updateEntry = entries?.find(
			(entry) => entry.key.value === 'demo.update'
		);
		const bindingItem = updateEntry?.value.items.find(
			(item) => item.key?.value === 'binding'
		);
		expect(bindingItem?.value).toMatchObject({
			nodeType: 'Scalar_String',
			value: 'id',
		});
	});

	it('forwards warnings through the provided hook', () => {
		const warnings: unknown[] = [];
		const config: PolicyModuleConfig = {
			origin: 'wpk.config.ts',
			namespace: 'Demo\\Plugin\\Policy',
			policyMap: {
				definitions: [],
				fallback: {
					capability: 'manage_demo',
					appliesTo: 'resource',
				},
				missing: ['demo.delete'],
				unused: ['demo.view'],
				warnings: [
					{
						code: 'policy-map.binding.missing',
						message: 'Binding missing for policy.',
					},
				],
			},
			hooks: {
				onWarning: (warning) => warnings.push(warning),
			},
		};

		buildPolicyModule(config);

		expect(warnings).toEqual([
			{
				kind: 'policy-map-warning',
				warning: {
					code: 'policy-map.binding.missing',
					message: 'Binding missing for policy.',
					context: undefined,
				},
			},
			{
				kind: 'policy-definition-missing',
				policy: 'demo.delete',
				fallbackCapability: 'manage_demo',
				fallbackScope: 'resource',
			},
			{
				kind: 'policy-definition-unused',
				policy: 'demo.view',
				capability: undefined,
				scope: undefined,
			},
		]);
	});
});
