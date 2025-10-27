import { createPhpIndexFileHelper } from '../indexFile';
import { getPhpBuilderChannel, resetPhpBuilderChannel } from '../channel';
import { resetPhpAstChannel } from '@wpkernel/php-json-ast';
import type { IRResource } from '../../../ir/publicTypes';
import {
	createBuilderInput,
	createBuilderOutput,
	createMinimalIr,
	createPipelineContext,
} from '../../../../../tests/test-support/php-builder.test-support';

describe('createPhpIndexFileHelper', () => {
	it('skips generation when no IR is present', async () => {
		const context = createPipelineContext();
		resetPhpBuilderChannel(context);
		resetPhpAstChannel(context);

		const helper = createPhpIndexFileHelper();
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

	it('indexes base controllers and resource controllers', async () => {
		const context = createPipelineContext();
		resetPhpBuilderChannel(context);
		resetPhpAstChannel(context);

		const helper = createPhpIndexFileHelper();
		const resources: IRResource[] = [
			makeResource('books'),
			makeResource('authors'),
		];

		const ir = createMinimalIr({
			resources,
			php: {
				namespace: 'Demo\\Plugin',
				outputDir: '.generated/php',
				autoload: 'inc/',
			},
		});

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
			(candidate) => candidate.metadata.kind === 'index-file'
		);

		expect(entry).toBeDefined();
		const namespaceStmt = entry?.program.find(
			(stmt: any) => stmt?.nodeType === 'Stmt_Namespace'
		) as { stmts?: any[] } | undefined;
		const returnStatement = namespaceStmt?.stmts?.find(
			(stmt: any) => stmt?.nodeType === 'Stmt_Return'
		) as { expr?: any } | undefined;

		expect(returnStatement?.expr?.items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					key: expect.objectContaining({
						value: 'Demo\\Plugin\\Rest\\BooksController',
					}),
				}),
				expect.objectContaining({
					key: expect.objectContaining({
						value: 'Demo\\Plugin\\Rest\\AuthorsController',
					}),
				}),
			])
		);
	});
});

function makeResource(name: string): IRResource {
	return {
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
	};
}
