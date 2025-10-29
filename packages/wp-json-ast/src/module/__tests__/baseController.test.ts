import type { PhpStmtClass, PhpStmtClassMethod } from '@wpkernel/php-json-ast';

import { buildBaseControllerProgram } from '../baseController';
import { moduleSegment } from '../../common/module';

describe('buildBaseControllerProgram', () => {
	it('emits a base controller class with docblock metadata', () => {
		const result = buildBaseControllerProgram({
			origin: 'wpk.config.ts',
			namespace: {
				pluginNamespace: 'Demo\\Plugin',
				sanitizedPluginNamespace: 'demo-plugin',
				segments: [
					moduleSegment('Generated', ''),
					moduleSegment('Rest', ''),
				],
			},
			metadataName: 'rest-base',
		});

		expect(result.namespace).toBe('Demo\\Plugin\\Generated\\Rest');
		expect(result.docblock).toEqual([
			'Source: wpk.config.ts → resources (namespace: demo-plugin)',
		]);
		expect(result.metadata).toEqual({
			kind: 'base-controller',
			name: 'rest-base',
		});
		expect(result.statements).toHaveLength(1);

		const classNode = result.statements[0] as PhpStmtClass;
		expect(classNode.nodeType).toBe('Stmt_Class');
		expect(classNode.name?.name).toBe('BaseController');

		const method = classNode.stmts?.[0] as PhpStmtClassMethod;
		expect(method.name.name).toBe('get_namespace');
		const returnStmt = method.stmts?.[0] as {
			expr: { value: string };
		};
		expect(returnStmt.expr.value).toBe('demo-plugin');
	});
});
