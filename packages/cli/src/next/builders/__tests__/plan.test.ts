import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { buildWorkspace } from '../../workspace';
import { createApplyPlanBuilder } from '../plan';
import type { BuilderOutput } from '../../runtime/types';
import {
	makePhpIrFixture,
	makeWpPostResource,
} from '@wpkernel/test-utils/next/builders/php/resources.test-support';
import * as phpDriver from '@wpkernel/php-driver';
import type { PhpProgram } from '@wpkernel/php-json-ast';

async function withWorkspace<T>(run: (root: string) => Promise<T>): Promise<T> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'plan-builder-'));
	try {
		return await run(root);
	} finally {
		await fs.rm(root, { recursive: true, force: true });
	}
}

function buildReporter() {
	return {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		child: jest.fn().mockReturnThis(),
	};
}

function buildOutput(): BuilderOutput {
	const actions: BuilderOutput['actions'] = [];
	return {
		actions,
		queueWrite(action) {
			actions.push(action);
		},
	};
}

function expectNodeOfType<T extends { nodeType: string }>(
	node: T | null | undefined,
	type: string
): T {
	expect(node).toBeDefined();
	expect(node?.nodeType).toBe(type);
	return node as T;
}

describe('createApplyPlanBuilder', () => {
	it('emits shim instructions for resources', async () => {
		await withWorkspace(async (workspaceRoot) => {
			const workspace = buildWorkspace(workspaceRoot);
			const reporter = buildReporter();
			const output = buildOutput();

			const ir = makePhpIrFixture({
				resources: [
					makeWpPostResource({ name: 'jobs', schemaKey: 'job' }),
				],
			});

			const capturedPrograms: PhpProgram[] = [];
			const prettyPrinterSpy = jest
				.spyOn(phpDriver, 'buildPhpPrettyPrinter')
				.mockImplementation(() => ({
					async prettyPrint(payload) {
						capturedPrograms.push(payload.program);
						return {
							code: '<?php // shim\n',
							ast: payload.program,
						};
					},
				}));

			const helper = createApplyPlanBuilder();
			await helper.apply(
				{
					context: {
						workspace,
						reporter,
						phase: 'generate' as const,
					},
					input: {
						phase: 'generate' as const,
						options: {
							config: ir.config,
							namespace: ir.meta.namespace,
							origin: ir.meta.origin,
							sourcePath: path.join(
								workspaceRoot,
								'wpk.config.ts'
							),
						},
						ir,
					},
					output,
					reporter,
				},
				undefined
			);

			const planPath = path.posix.join('.wpk', 'apply', 'plan.json');
			const planRaw = await workspace.readText(planPath);
			expect(planRaw).toBeTruthy();
			const plan = JSON.parse(planRaw ?? '{}') as {
				instructions?: Array<{
					file: string;
					base: string;
					incoming: string;
				}>;
			};
			expect(plan.instructions).toBeDefined();
			expect(plan.instructions).toHaveLength(1);

			const [instruction] = plan.instructions ?? [];
			expect(instruction).toMatchObject({
				file: 'inc/Rest/JobsController.php',
				base: '.wpk/apply/base/inc/Rest/JobsController.php',
				incoming: '.wpk/apply/incoming/inc/Rest/JobsController.php',
			});

			const incomingPath = path.posix.join(
				'.wpk',
				'apply',
				'incoming',
				'inc',
				'Rest',
				'JobsController.php'
			);
			const incoming = await workspace.readText(incomingPath);

			const basePath = path.posix.join(
				'.wpk',
				'apply',
				'base',
				'inc',
				'Rest',
				'JobsController.php'
			);
			const base = await workspace.readText(basePath);
			expect(base).toBe(incoming);

			expect(output.actions.map((action) => action.file)).toEqual(
				expect.arrayContaining([planPath, incomingPath, basePath])
			);

			expect(capturedPrograms).toHaveLength(1);
			const [program] = capturedPrograms;
			const namespaceStmt = expectNodeOfType(
				program.find((stmt) => stmt.nodeType === 'Stmt_Namespace'),
				'Stmt_Namespace'
			);
			expect(namespaceStmt.name?.parts).toEqual([
				'Demo',
				'Plugin',
				'Rest',
			]);

			const ifStatement = expectNodeOfType(
				namespaceStmt.stmts.find((stmt) => stmt.nodeType === 'Stmt_If'),
				'Stmt_If'
			);
			expect(ifStatement.cond.nodeType).toBe('Expr_BooleanNot');
			const funcCall = expectNodeOfType(
				ifStatement.cond.expr,
				'Expr_FuncCall'
			);
			expect(funcCall.name.nodeType).toBe('Name');
			expect(funcCall.name.parts).toEqual(['class_exists']);

			const classArg = expectNodeOfType(
				funcCall.args[0]?.value,
				'Expr_ClassConstFetch'
			);
			expect(classArg.class.nodeType).toBe('Name');
			expect(classArg.class.parts).toEqual([
				'Demo',
				'Plugin',
				'Generated',
				'Rest',
				'JobsController',
			]);

			const requireStatement = expectNodeOfType(
				ifStatement.stmts[0],
				'Stmt_Expression'
			);
			const requireCall = expectNodeOfType(
				requireStatement.expr,
				'Expr_FuncCall'
			);
			expect(requireCall.name.nodeType).toBe('Name');
			expect(requireCall.name.parts).toEqual(['require_once']);

			const requireArg = expectNodeOfType(
				requireCall.args[0]?.value,
				'Expr_BinaryOp_Concat'
			);
			const requireSuffix = expectNodeOfType(
				requireArg.right,
				'Scalar_String'
			);
			expect(requireSuffix.value).toBe(
				'/../../.generated/php/Rest/JobsController.php'
			);

			const classStmt = expectNodeOfType(
				namespaceStmt.stmts.find(
					(stmt) => stmt.nodeType === 'Stmt_Class'
				),
				'Stmt_Class'
			);
			expect(classStmt.name?.name).toBe('JobsController');
			const extendsName = expectNodeOfType(classStmt.extends, 'Name');
			expect(extendsName.parts).toEqual([
				'Demo',
				'Plugin',
				'Generated',
				'Rest',
				'JobsController',
			]);

			prettyPrinterSpy.mockRestore();
		});
	});
});
