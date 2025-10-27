import {
	buildPersistencePayload,
	createPhpPersistenceRegistryHelper,
} from '../persistenceRegistry';
import { getPhpBuilderChannel, resetPhpBuilderChannel } from '../channel';
import { resetPhpAstChannel } from '@wpkernel/php-json-ast';
import type { IRResource } from '../../../ir/publicTypes';
import {
	createBuilderInput,
	createBuilderOutput,
	createMinimalIr,
	createPipelineContext,
} from '../../../../../tests/test-support/php-builder.test-support';

describe('createPhpPersistenceRegistryHelper', () => {
	it('skips generation when the IR is unavailable', async () => {
		const context = createPipelineContext();
		resetPhpBuilderChannel(context);
		resetPhpAstChannel(context);

		const helper = createPhpPersistenceRegistryHelper();
		const next = jest.fn();

		await helper.apply(
			{
				context,
				input: createBuilderInput({ ir: null }),
				output: createBuilderOutput(),
				reporter: context.reporter,
			},
			next
		);

		expect(next).toHaveBeenCalledTimes(1);
		expect(getPhpBuilderChannel(context).pending()).toHaveLength(0);
	});

	it('queues a registry with sanitised persistence metadata', async () => {
		const context = createPipelineContext();
		resetPhpBuilderChannel(context);
		resetPhpAstChannel(context);

		const resources: IRResource[] = [
			makeResource('books', {
				storage: { driver: 'wp', options: { table: 'posts' } },
				identity: { type: 'primary', field: 'ID' },
			}),
			makeResource('drafts', {
				storage: { driver: 'wp', options: { table: 'posts' } },
			}),
			makeResource('ignored'),
		];

		const helper = createPhpPersistenceRegistryHelper();
		const ir = createMinimalIr({ resources });

		await helper.apply(
			{
				context,
				input: createBuilderInput({ ir }),
				output: createBuilderOutput(),
				reporter: context.reporter,
			},
			undefined
		);

		const pending = getPhpBuilderChannel(context).pending();
		const entry = pending.find(
			(candidate) => candidate.metadata.kind === 'persistence-registry'
		);

		expect(entry).toBeDefined();
		const namespaceStmt = entry?.program.find(
			(stmt: any) => stmt?.nodeType === 'Stmt_Namespace'
		) as { stmts?: any[] } | undefined;
		const classStmt = namespaceStmt?.stmts?.find(
			(stmt: any) => stmt?.nodeType === 'Stmt_Class'
		) as { stmts?: any[] } | undefined;
		const method = classStmt?.stmts?.find(
			(stmt: any) =>
				stmt?.nodeType === 'Stmt_ClassMethod' &&
				stmt?.name?.name === 'get_config'
		) as { stmts?: any[] } | undefined;
		const returnStmt = method?.stmts?.find(
			(stmt: any) => stmt?.nodeType === 'Stmt_Return'
		) as { expr?: any } | undefined;

		expect(returnStmt?.expr?.items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					key: expect.objectContaining({ value: 'resources' }),
				}),
			])
		);

		const resourcesArray = returnStmt?.expr?.items?.[0]?.value;
		expect(resourcesArray?.items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					key: expect.objectContaining({ value: 'books' }),
				}),
				expect.objectContaining({
					key: expect.objectContaining({ value: 'drafts' }),
				}),
			])
		);
	});
});

describe('buildPersistencePayload', () => {
	it('omits resources without persistence metadata and fills null defaults', () => {
		const resources: IRResource[] = [
			makeResource('books', {
				storage: { driver: 'wp', options: { table: 'posts' } },
				identity: { type: 'primary', field: 'ID' },
			}),
			makeResource('drafts', {
				storage: { driver: 'wp', options: { table: 'posts' } },
			}),
			makeResource('ignored'),
		];

		const payload = buildPersistencePayload(resources);
		expect(payload.resources).toMatchObject({
			books: {
				storage: { driver: 'wp', options: { table: 'posts' } },
				identity: { type: 'primary', field: 'ID' },
			},
			drafts: {
				storage: { driver: 'wp', options: { table: 'posts' } },
				identity: null,
			},
		});
		expect(payload.resources).not.toHaveProperty('ignored');
	});
});

function makeResource(
	name: string,
	overrides?: Partial<Pick<IRResource, 'storage' | 'identity'>>
): IRResource {
	return {
		...overrides,
		name,
		schemaKey: `${name}.schema`,
		schemaProvenance: 'manual',
		routes: [
			{
				method: 'GET',
				path: `/kernel/v1/${name}`,
				transport: 'local',
				hash: `${name}-get`,
			},
		],
		cacheKeys: {
			list: { segments: [], source: 'default' },
			get: { segments: [], source: 'default' },
		},
		hash: `${name}-hash`,
		warnings: [],
	} as IRResource;
}
