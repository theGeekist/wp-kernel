import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { buildWorkspace } from '../../workspace';
import { createApplyPlanBuilder } from '../plan';
import type { BuilderOutput } from '../../runtime/types';
import { buildEmptyGenerationState } from '../../apply/manifest';
import type { GenerationManifest } from '../../apply/manifest';
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

			const capturedPrograms: Array<{
				program: PhpProgram;
				filePath: string;
			}> = [];
			const prettyPrinterSpy = jest
				.spyOn(phpDriver, 'buildPhpPrettyPrinter')
				.mockImplementation(() => ({
					async prettyPrint(payload) {
						capturedPrograms.push({
							program: payload.program,
							filePath: payload.filePath,
						});
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
						generationState: buildEmptyGenerationState(),
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
					base?: string;
					incoming?: string;
					action?: string;
				}>;
			};
			expect(plan.instructions).toBeDefined();
			expect(plan.instructions).toHaveLength(2);

			const pluginInstruction = plan.instructions?.find(
				(entry) => entry.file === 'plugin.php'
			);
			expect(pluginInstruction).toMatchObject({
				action: 'write',
				base: '.wpk/apply/base/plugin.php',
				incoming: '.wpk/apply/incoming/plugin.php',
			});

			const shimInstruction = plan.instructions?.find(
				(entry) => entry.file === 'inc/Rest/JobsController.php'
			);
			expect(shimInstruction).toMatchObject({
				action: 'write',
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

			const loaderIncomingPath = path.posix.join(
				'.wpk',
				'apply',
				'incoming',
				'plugin.php'
			);
			const loaderIncoming = await workspace.readText(loaderIncomingPath);
			const loaderBasePath = path.posix.join(
				'.wpk',
				'apply',
				'base',
				'plugin.php'
			);
			const loaderBase = await workspace.readText(loaderBasePath);
			expect(loaderBase).toBe(loaderIncoming);

			expect(output.actions.map((action) => action.file)).toEqual(
				expect.arrayContaining([
					planPath,
					incomingPath,
					basePath,
					loaderIncomingPath,
					loaderBasePath,
				])
			);

			expect(capturedPrograms).toHaveLength(2);

			const toRelative = (absolute: string): string =>
				path
					.relative(workspaceRoot, absolute)
					.split(path.sep)
					.join('/');

			const loaderProgramEntry = capturedPrograms.find(
				(entry) =>
					toRelative(entry.filePath) ===
					'.wpk/apply/incoming/plugin.php'
			);
			expect(loaderProgramEntry).toBeDefined();
			const loaderProgram = loaderProgramEntry?.program ?? [];
			const loaderNamespace = expectNodeOfType(
				loaderProgram.find(
					(stmt) => stmt.nodeType === 'Stmt_Namespace'
				),
				'Stmt_Namespace'
			);
			expect(loaderNamespace.name?.parts).toEqual(['Demo', 'Plugin']);

			const programEntry = capturedPrograms.find(
				(entry) =>
					toRelative(entry.filePath) ===
					'.wpk/apply/incoming/inc/Rest/JobsController.php'
			);
			expect(programEntry).toBeDefined();
			const program = programEntry?.program ?? [];
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

	it('falls back to require guards when no autoload root is defined', async () => {
		await withWorkspace(async (workspaceRoot) => {
			const workspace = buildWorkspace(workspaceRoot);
			const reporter = buildReporter();
			const output = buildOutput();

			const ir = makePhpIrFixture({
				resources: [
					makeWpPostResource({ name: 'jobs', schemaKey: 'job' }),
				],
			});
			ir.php.autoload = '';

			const capturedPrograms: Array<{
				program: PhpProgram;
				filePath: string;
			}> = [];
			const prettyPrinterSpy = jest
				.spyOn(phpDriver, 'buildPhpPrettyPrinter')
				.mockImplementation(() => ({
					async prettyPrint(payload) {
						capturedPrograms.push({
							program: payload.program,
							filePath: payload.filePath,
						});
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
						generationState: buildEmptyGenerationState(),
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
			expect(plan.instructions).toHaveLength(2);

			const pluginInstruction = plan.instructions?.find(
				(entry) => entry.file === 'plugin.php'
			);
			expect(pluginInstruction).toMatchObject({
				base: '.wpk/apply/base/plugin.php',
				incoming: '.wpk/apply/incoming/plugin.php',
			});

			const shimInstruction = plan.instructions?.find(
				(entry) => entry.file === 'Rest/JobsController.php'
			);
			expect(shimInstruction).toMatchObject({
				base: '.wpk/apply/base/Rest/JobsController.php',
				incoming: '.wpk/apply/incoming/Rest/JobsController.php',
			});

			expect(capturedPrograms).toHaveLength(2);

			const toRelative = (absolute: string): string =>
				path
					.relative(workspaceRoot, absolute)
					.split(path.sep)
					.join('/');

			const loaderProgramEntry = capturedPrograms.find(
				(entry) =>
					toRelative(entry.filePath) ===
					'.wpk/apply/incoming/plugin.php'
			);
			expect(loaderProgramEntry).toBeDefined();
			const loaderProgram = loaderProgramEntry?.program ?? [];
			const loaderNamespace = expectNodeOfType(
				loaderProgram.find(
					(stmt) => stmt.nodeType === 'Stmt_Namespace'
				),
				'Stmt_Namespace'
			);
			expect(loaderNamespace.name?.parts).toEqual(['Demo', 'Plugin']);

			const programEntry = capturedPrograms.find(
				(entry) =>
					toRelative(entry.filePath) ===
					'.wpk/apply/incoming/Rest/JobsController.php'
			);
			expect(programEntry).toBeDefined();
			const program = programEntry?.program ?? [];
			const namespaceStmt = expectNodeOfType(
				program.find((stmt) => stmt.nodeType === 'Stmt_Namespace'),
				'Stmt_Namespace'
			);
			const ifStatement = expectNodeOfType(
				namespaceStmt.stmts.find((stmt) => stmt.nodeType === 'Stmt_If'),
				'Stmt_If'
			);
			const requireStatement = expectNodeOfType(
				ifStatement.stmts[0],
				'Stmt_Expression'
			);
			const requireCall = expectNodeOfType(
				requireStatement.expr,
				'Expr_FuncCall'
			);
			const requireArg = expectNodeOfType(
				requireCall.args[0]?.value,
				'Expr_BinaryOp_Concat'
			);
			const requireSuffix = expectNodeOfType(
				requireArg.right,
				'Scalar_String'
			);
			expect(requireSuffix.value).toBe(
				'/../.generated/php/Rest/JobsController.php'
			);

			prettyPrinterSpy.mockRestore();
		});
	});

	it('skips plugin loader instructions when an author-owned loader is detected', async () => {
		await withWorkspace(async (workspaceRoot) => {
			const workspace = buildWorkspace(workspaceRoot);
			const reporter = buildReporter();
			const output = buildOutput();

			const ir = makePhpIrFixture({
				resources: [
					makeWpPostResource({ name: 'jobs', schemaKey: 'job' }),
				],
			});

			await workspace.write('plugin.php', '<?php\n// custom loader\n', {
				ensureDir: true,
			});

			const capturedPrograms: Array<{
				program: PhpProgram;
				filePath: string;
			}> = [];
			const prettyPrinterSpy = jest
				.spyOn(phpDriver, 'buildPhpPrettyPrinter')
				.mockImplementation(() => ({
					async prettyPrint(payload) {
						capturedPrograms.push({
							program: payload.program,
							filePath: payload.filePath,
						});
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
						generationState: buildEmptyGenerationState(),
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
			expect(plan.instructions?.[0]).toMatchObject({
				file: 'inc/Rest/JobsController.php',
			});
			expect(
				plan.instructions?.some(
					(entry) => entry.file === 'plugin.php'
				) ?? false
			).toBe(false);

			const loaderIncomingPath = path.posix.join(
				'.wpk',
				'apply',
				'incoming',
				'plugin.php'
			);
			const loaderIncoming = await workspace.readText(loaderIncomingPath);
			expect(loaderIncoming).toBeNull();

			expect(capturedPrograms).toHaveLength(1);

			prettyPrinterSpy.mockRestore();
		});
	});

	it('emits deletion instructions for removed shims', async () => {
		await withWorkspace(async (workspaceRoot) => {
			const workspace = buildWorkspace(workspaceRoot);
			const reporter = buildReporter();
			const output = buildOutput();

			const ir = makePhpIrFixture({ resources: [] });
			const helper = createApplyPlanBuilder();
			const previous: GenerationManifest = {
				version: 1,
				resources: {
					jobs: {
						hash: 'legacy',
						artifacts: {
							generated: [
								'.generated/php/Rest/JobsController.php',
							],
							shims: ['inc/Rest/JobsController.php'],
						},
					},
				},
			};

			await helper.apply({
				context: {
					workspace,
					reporter,
					phase: 'generate',
					generationState: previous,
				},
				input: {
					phase: 'generate',
					options: {
						config: ir.config,
						namespace: ir.meta.namespace,
						origin: ir.meta.origin,
						sourcePath: path.join(workspaceRoot, 'wpk.config.ts'),
					},
					ir,
				},
				output,
				reporter,
			});

			const planPath = path.posix.join('.wpk', 'apply', 'plan.json');
			const planRaw = await workspace.readText(planPath);
			expect(planRaw).toBeTruthy();
			const plan = JSON.parse(planRaw ?? '{}') as {
				instructions?: Array<{ file: string; action?: string }>;
			};

			const deletion = plan.instructions?.find(
				(entry) =>
					entry.file === 'inc/Rest/JobsController.php' &&
					entry.action === 'delete'
			);

			expect(deletion).toBeDefined();
		});
	});

	it('emits deletion instructions when shim paths change between runs', async () => {
		await withWorkspace(async (workspaceRoot) => {
			const workspace = buildWorkspace(workspaceRoot);
			const reporter = buildReporter();
			const output = buildOutput();

			const baseIr = makePhpIrFixture({
				resources: [
					makeWpPostResource({ name: 'jobs', schemaKey: 'job' }),
				],
			});
			const ir = {
				...baseIr,
				php: {
					...baseIr.php,
					autoload: 'includes/',
				},
			};

			const helper = createApplyPlanBuilder();
			const previous: GenerationManifest = {
				version: 1,
				resources: {
					jobs: {
						hash: 'legacy',
						artifacts: {
							generated: [
								'.generated/php/Rest/JobsController.php',
							],
							shims: ['inc/Rest/JobsController.php'],
						},
					},
				},
			};

			await helper.apply({
				context: {
					workspace,
					reporter,
					phase: 'generate',
					generationState: previous,
				},
				input: {
					phase: 'generate',
					options: {
						config: ir.config,
						namespace: ir.meta.namespace,
						origin: ir.meta.origin,
						sourcePath: path.join(workspaceRoot, 'wpk.config.ts'),
					},
					ir,
				},
				output,
				reporter,
			});

			const planPath = path.posix.join('.wpk', 'apply', 'plan.json');
			const planRaw = await workspace.readText(planPath);
			expect(planRaw).toBeTruthy();
			const plan = JSON.parse(planRaw ?? '{}') as {
				instructions?: Array<{ file: string; action?: string }>;
			};

			const deletion = plan.instructions?.find(
				(entry) =>
					entry.file === 'inc/Rest/JobsController.php' &&
					entry.action === 'delete'
			);

			expect(deletion).toBeDefined();
		});
	});

	it('skips plugin loader emission when the IR artifact is missing', async () => {
		await withWorkspace(async (workspaceRoot) => {
			const workspace = buildWorkspace(workspaceRoot);
			const reporter = buildReporter();
			const output = buildOutput();

			const helper = createApplyPlanBuilder();
			await helper.apply(
				{
					context: {
						workspace,
						reporter,
						phase: 'generate',
						generationState: buildEmptyGenerationState(),
					},
					input: {
						phase: 'generate',
						options: {
							config: {
								version: 1,
								namespace: 'Demo',
								resources: {},
								schemas: {},
							},
							namespace: 'Demo',
							origin: 'typescript',
							sourcePath: path.join(
								workspaceRoot,
								'wpk.config.ts'
							),
						},
						ir: null,
					},
					output,
					reporter,
				},
				undefined
			);

			expect(reporter.warn).toHaveBeenCalledWith(
				'createApplyPlanBuilder: IR artifact missing, skipping plugin loader emission.'
			);

			const planRaw = await workspace.readText(
				path.posix.join('.wpk', 'apply', 'plan.json')
			);
			expect(planRaw).toBeTruthy();
			const plan = JSON.parse(planRaw ?? '{}') as {
				instructions?: unknown;
			};
			expect(plan.instructions).toEqual([]);
		});
	});
});
