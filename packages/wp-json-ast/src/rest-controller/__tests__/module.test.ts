import { buildRestControllerModule } from '../module';
import type { RestControllerModuleConfig } from '../module';
import {
	buildReturn,
	buildScalarString,
	type PhpStmtUse,
} from '@wpkernel/php-json-ast';

describe('buildRestControllerModule', () => {
	it('emits base, controller, and index files with docblocks and metadata', () => {
		type ControllerConfig =
			RestControllerModuleConfig['controllers'][number];

		const controller: ControllerConfig = {
			className: 'BookController',
			resourceName: 'book',
			schemaKey: 'book',
			schemaProvenance: 'manual',
			restArgsExpression: buildScalarString('args'),
			identity: { type: 'string', param: 'slug' },
			routes: [
				{
					methodName: 'get_item',
					metadata: {
						method: 'GET',
						path: '/demo/v1/books/:slug',
						kind: 'get',
					},
					statements: [buildReturn(buildScalarString('ok'))],
				},
			],
			helperMethods: [],
			capabilityClass: 'Demo\\Plugin\\Capability\\Capability',
			fileName: 'Rest/BookController.php',
		};

		const result = buildRestControllerModule({
			origin: 'wpk.config.ts',
			sanitizedNamespace: 'demo-plugin',
			namespace: 'Demo\\Plugin\\Rest',
			controllers: [controller],
			additionalIndexEntries: [
				{
					className: 'Demo\\Plugin\\Capability\\Capability',
					path: 'Capability/Capability.php',
				},
			],
		});

		expect(result.files.map((file) => file.fileName)).toEqual([
			'Rest/BaseController.php',
			'Rest/BookController.php',
			'index.php',
		]);

		const baseFile = result.files.find(
			(file) => file.fileName === 'Rest/BaseController.php'
		);
		expect(baseFile).toBeDefined();
		if (!baseFile) {
			throw new Error('Expected base controller file to be emitted.');
		}
		expect(baseFile.docblock).toContain(
			'Source: wpk.config.ts → resources (namespace: demo-plugin)'
		);
		expect(baseFile.metadata).toEqual({ kind: 'base-controller' });

		const controllerFile = result.files.find(
			(file) => file.fileName === 'Rest/BookController.php'
		);
		expect(controllerFile).toBeDefined();
		if (!controllerFile) {
			throw new Error('Expected resource controller file to be emitted.');
		}
		expect(controllerFile.metadata).toMatchObject({
			kind: 'resource-controller',
			name: 'book',
		});
		expect(controllerFile.docblock).toEqual([
			'Source: wpk.config.ts → resources.book',
			'Schema: book (manual)',
			'Route: [GET] /demo/v1/books/:slug',
		]);
		expect(controllerFile.program[0]).toMatchObject({
			nodeType: 'Stmt_Declare',
		});
		expect(controllerFile.program[1]).toMatchObject({
			nodeType: 'Stmt_Namespace',
			name: expect.objectContaining({
				parts: ['Demo', 'Plugin', 'Rest'],
			}),
		});

		const indexFile = result.files.find(
			(file) => file.fileName === 'index.php'
		);
		expect(indexFile).toBeDefined();
		if (!indexFile) {
			throw new Error('Expected index file to be emitted.');
		}
		expect(indexFile.docblock).toEqual([
			'Source: wpk.config.ts → php/index',
		]);
		expect(indexFile.program[1]).toMatchObject({ nodeType: 'Stmt_Return' });

		const indexArray = (
			indexFile.program[1] as { expr: { items: unknown[] } }
		).expr.items as Array<{
			key: { value: string };
			value: { nodeType: string };
		}>;
		const entryKeys = indexArray.map((item) => item.key.value);
		expect(entryKeys).toEqual([
			'Demo\\Plugin\\Rest\\BaseController',
			'Demo\\Plugin\\Rest\\BookController',
			'Demo\\Plugin\\Capability\\Capability',
		]);
		indexArray.forEach((item) => {
			expect(item.value.nodeType).toBe('Expr_BinaryOp_Concat');
		});
	});

	it('emits use statements with php-parser type codes', () => {
		type ControllerConfig =
			RestControllerModuleConfig['controllers'][number];

		const controller: ControllerConfig = {
			className: 'BookController',
			resourceName: 'book',
			schemaKey: 'book',
			schemaProvenance: 'manual',
			restArgsExpression: buildScalarString('args'),
			identity: { type: 'string', param: 'slug' },
			routes: [
				{
					methodName: 'get_item',
					metadata: {
						method: 'GET',
						path: '/demo/v1/books/:slug',
						kind: 'get',
					},
					statements: [buildReturn(buildScalarString('ok'))],
				},
			],
			helperMethods: [],
			capabilityClass: 'Demo\\Plugin\\Capability\\Capability',
			fileName: 'Rest/BookController.php',
		};

		const result = buildRestControllerModule({
			origin: 'wpk.config.ts',
			sanitizedNamespace: 'demo-plugin',
			namespace: 'Demo\\Plugin\\Rest',
			controllers: [controller],
			includeBaseController: false,
		});

		const controllerFile = result.files.find(
			(file) => file.fileName === 'Rest/BookController.php'
		);
		expect(controllerFile).toBeDefined();
		if (!controllerFile) {
			throw new Error('Expected controller file to be emitted.');
		}

		const namespaceStatement = controllerFile.program.find(
			(statement) => statement.nodeType === 'Stmt_Namespace'
		) as { stmts?: unknown[] } | undefined;
		expect(namespaceStatement).toBeDefined();
		if (!namespaceStatement) {
			throw new Error('Expected namespace statement to be emitted.');
		}

		const useStatements = (namespaceStatement.stmts ?? []).filter(
			(statement): statement is PhpStmtUse =>
				typeof statement === 'object' &&
				statement !== null &&
				(statement as { nodeType?: unknown }).nodeType === 'Stmt_Use'
		);

		const normalImport = useStatements.find((statement) =>
			statement.uses?.some(
				(use) => use.name?.parts?.join('\\') === 'WP_Error'
			)
		);
		expect(normalImport?.type).toBe(1);
		expect(normalImport?.uses?.[0]?.type).toBe(0);

		const functionImport = useStatements.find((statement) =>
			statement.uses?.some(
				(use) => use.name?.parts?.join('\\') === 'is_wp_error'
			)
		);
		expect(functionImport?.type).toBe(2);
		expect(functionImport?.uses?.[0]?.type).toBe(0);
	});
});
