import { buildRestControllerModuleFromPlan } from '../pipeline';
import type { RestControllerResourcePlan } from '../pipeline';
import { buildReturn, buildScalarString } from '@wpkernel/php-json-ast';
import type { ResourceControllerMetadata } from '../../types';

describe('buildRestControllerModuleFromPlan', () => {
	it('builds controller module files from declarative plans', () => {
		const resourcePlan: RestControllerResourcePlan = {
			name: 'book',
			className: 'BookController',
			schemaKey: 'book',
			schemaProvenance: 'manual',
			restArgsExpression: buildScalarString('args'),
			identity: { type: 'number', param: 'id' },
			cacheKeys: {
				list: { segments: ['books'] },
				get: { segments: ['book', ':id'] },
			},
			routes: [
				{
					definition: { method: 'GET', path: '/demo/v1/books' },
					methodName: 'get_items',
					buildStatements: () => [
						buildReturn(buildScalarString('ok')),
					],
				},
				{
					definition: {
						method: 'POST',
						path: '/demo/v1/books',
						capability: 'create_books',
					},
					methodName: 'create_item',
					buildStatements: () => [],
					buildFallbackStatements: () => [
						buildReturn(buildScalarString('nope')),
					],
				},
			],
		} satisfies RestControllerResourcePlan;

		const result = buildRestControllerModuleFromPlan({
			origin: 'wpk.config.ts',
			pluginNamespace: 'Demo\\Plugin',
			sanitizedNamespace: 'demo-plugin',
			capabilityClass: 'Demo\\Plugin\\Capability\\Capability',
			resources: [resourcePlan],
			includeBaseController: false,
		});

		expect(result.files.map((file) => file.fileName)).toEqual([
			'Rest/BookController.php',
			'index.php',
		]);

		const controllerFile = result.files.find(
			(file) => file.fileName === 'Rest/BookController.php'
		);
		expectDefined(controllerFile, 'Expected controller file.');

		expect(controllerFile.metadata).toMatchObject({
			kind: 'resource-controller',
			name: 'book',
		});

		const controllerMetadata =
			controllerFile.metadata as ResourceControllerMetadata;
		expect(controllerMetadata.routes).toHaveLength(2);
		const firstRoute = controllerMetadata.routes[0];
		expectDefined(firstRoute, 'Expected first route metadata.');

		expect(firstRoute).toMatchObject({
			method: 'GET',
			path: '/demo/v1/books',
		});
		expect(firstRoute.kind).toBeDefined();

		const secondRoute = controllerMetadata.routes[1];
		expectDefined(secondRoute, 'Expected second route metadata.');

		expect(secondRoute).toMatchObject({
			method: 'POST',
			path: '/demo/v1/books',
		});
		expect(secondRoute.kind).toBeDefined();

		const namespaceNode = controllerFile.program.find(
			(statement) => statement.nodeType === 'Stmt_Namespace'
		) as {
			stmts: Array<{
				nodeType: string;
				name: { name: string };
				stmts: unknown[];
			}>;
		};
		expectDefined(namespaceNode, 'Expected namespace definition.');

		const classNode = namespaceNode.stmts.find(
			(statement) => statement.nodeType === 'Stmt_Class'
		) as {
			stmts: Array<{
				nodeType: string;
				name: { name: string };
				stmts: unknown[];
			}>;
		};
		expectDefined(classNode, 'Expected controller class definition.');

		const createMethod = classNode.stmts.find(
			(statement) =>
				statement.nodeType === 'Stmt_ClassMethod' &&
				statement.name.name === 'create_item'
		);
		expectDefined(createMethod, 'Expected create_item method.');
		expect(
			Array.isArray(createMethod?.stmts) &&
				createMethod?.stmts.some((stmt) =>
					JSON.stringify(stmt).includes('nope')
				)
		).toBe(true);
	});

	it('allows route plans to mutate metadata through the host', () => {
		const plan: RestControllerResourcePlan = {
			name: 'post',
			className: 'PostController',
			schemaKey: 'post',
			schemaProvenance: 'auto',
			restArgsExpression: buildScalarString('args'),
			identity: { type: 'string', param: 'slug' },
			cacheKeys: {
				list: { segments: ['posts'] },
				get: { segments: ['post', ':slug'] },
			},
			routes: [
				{
					definition: {
						method: 'GET',
						path: '/demo/v1/posts/:slug',
					},
					methodName: 'get_item',
					buildStatements: ({ metadataHost }) => {
						const current =
							metadataHost.getMetadata() as ResourceControllerMetadata;
						metadataHost.setMetadata({
							...current,
							routes: current.routes.map((route) => ({
								...route,
								tags: { ...route.tags, mutated: 'yes' },
							})),
						});

						return [buildReturn(buildScalarString('ok'))];
					},
				},
			],
		} satisfies RestControllerResourcePlan;

		const result = buildRestControllerModuleFromPlan({
			origin: 'wpk.config.ts',
			pluginNamespace: 'Demo\\Plugin',
			sanitizedNamespace: 'demo-plugin',
			capabilityClass: 'Demo\\Plugin\\Capability\\Capability',
			resources: [plan],
			includeBaseController: false,
		});

		const controllerFile = result.files.find(
			(file) => file.fileName === 'Rest/PostController.php'
		);
		expectDefined(controllerFile, 'Expected controller file.');

		const metadata = controllerFile.metadata as ResourceControllerMetadata;
		const mutatedRoute = metadata.routes[0];
		expectDefined(mutatedRoute, 'Expected mutated route metadata.');

		expect(mutatedRoute.tags).toEqual({ mutated: 'yes' });
	});
});

function expectDefined<T>(
	value: T | undefined | null,
	message?: string
): asserts value is T {
	expect(value).toBeDefined();
	if (value === undefined || value === null) {
		fail(message ?? 'Expected value to be defined.');
	}
}
