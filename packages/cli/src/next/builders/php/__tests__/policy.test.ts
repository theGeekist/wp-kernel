import { createPhpPolicyHelper } from '../policy';
import { getPhpBuilderChannel, resetPhpBuilderChannel } from '../channel';
import { resetPhpAstChannel } from '@wpkernel/php-json-ast';
import type { IRPolicyDefinition } from '../../../ir/publicTypes';
import {
	createBuilderInput,
	createBuilderOutput,
	createMinimalIr,
	createPipelineContext,
	createReporter,
} from '../../../../../tests/test-support/php-builder.test-support';

describe('createPhpPolicyHelper', () => {
	it('skips generation when the IR artifact is missing', async () => {
		const context = createPipelineContext();
		resetPhpBuilderChannel(context);
		resetPhpAstChannel(context);

		const helper = createPhpPolicyHelper();
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

	it('builds a policy helper that returns definition metadata', async () => {
		const definitions: IRPolicyDefinition[] = [
			{
				key: 'resource.read',
				capability: 'read_posts',
				appliesTo: 'resource',
				source: 'map',
			},
			{
				key: 'resource.update',
				capability: 'edit_post',
				appliesTo: 'object',
				binding: 'post',
				source: 'map',
			},
		];

		const context = createPipelineContext();
		resetPhpBuilderChannel(context);
		resetPhpAstChannel(context);

		const reporter = createReporter();
		const ir = createMinimalIr({
			policyMap: {
				definitions,
				fallback: { capability: 'manage_demo', appliesTo: 'resource' },
				missing: ['resource.delete'],
				unused: ['resource.archive'],
				warnings: [
					{
						code: 'demo',
						message: 'Example warning',
						context: { scope: 'policy' },
					},
				],
			},
		});

		const helper = createPhpPolicyHelper();
		await helper.apply(
			{
				context,
				input: createBuilderInput({ ir }),
				output: createBuilderOutput(),
				reporter,
			},
			undefined
		);

		const pending = getPhpBuilderChannel(context).pending();
		const entry = pending.find(
			(candidate) => candidate.metadata.kind === 'policy-helper'
		);
		expect(entry).toBeDefined();

		const namespaceStmt = entry?.program.find(
			(stmt: any) => stmt?.nodeType === 'Stmt_Namespace'
		) as { stmts?: any[] } | undefined;
		const classStmt = namespaceStmt?.stmts?.find(
			(stmt: any) => stmt?.nodeType === 'Stmt_Class'
		) as { stmts?: any[] } | undefined;

		const methodNames =
			classStmt?.stmts
				?.filter((stmt: any) => stmt?.nodeType === 'Stmt_ClassMethod')
				.map((method: any) => method?.name?.name) ?? [];
		expect(methodNames).toEqual(
			expect.arrayContaining([
				'policy_map',
				'fallback',
				'enforce',
				'create_error',
			])
		);

		const policyMapMethod = classStmt?.stmts?.find(
			(stmt: any) =>
				stmt?.nodeType === 'Stmt_ClassMethod' &&
				stmt?.name?.name === 'policy_map'
		) as { stmts?: any[] } | undefined;
		const returnStmt = policyMapMethod?.stmts?.find(
			(stmt: any) => stmt?.nodeType === 'Stmt_Return'
		) as { expr?: any } | undefined;

		expect(returnStmt?.expr?.items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					key: expect.objectContaining({ value: 'resource.read' }),
				}),
				expect.objectContaining({
					key: expect.objectContaining({ value: 'resource.update' }),
				}),
			])
		);
		expect(reporter.warn).toHaveBeenCalledWith(
			'Policy helper warning emitted.',
			expect.objectContaining({ code: 'demo' })
		);
		expect(reporter.warn).toHaveBeenCalledWith(
			'Policy falling back to default capability.',
			expect.objectContaining({
				policy: 'resource.delete',
				capability: 'manage_demo',
				scope: 'resource',
			})
		);
		expect(reporter.warn).toHaveBeenCalledWith(
			'Policy definition declared but unused.',
			expect.objectContaining({ policy: 'resource.archive' })
		);
	});
});
