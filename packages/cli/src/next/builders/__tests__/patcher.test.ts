import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { buildWorkspace } from '../../workspace';
import { createPatcher } from '../patcher';
import type { BuilderOutput } from '../../runtime/types';
import type { IRv1 } from '../../../ir/types';

async function withWorkspace<T>(run: (root: string) => Promise<T>): Promise<T> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'patcher-builder-'));
	try {
		return await run(root);
	} finally {
		await fs.rm(root, { recursive: true, force: true });
	}
}

function buildIr(namespace: string): IRv1 {
	return {
		meta: {
			version: 1,
			namespace,
			origin: 'kernel.config.ts',
			sourcePath: 'kernel.config.ts',
			sanitizedNamespace: namespace,
		},
		config: {
			version: 1,
			namespace,
			schemas: {},
			resources: {},
		},
		schemas: [],
		resources: [],
		policies: [],
		policyMap: {
			sourcePath: undefined,
			definitions: [],
			fallback: { capability: 'manage_options', appliesTo: 'resource' },
			missing: [],
			unused: [],
			warnings: [],
		},
		blocks: [],
		php: {
			namespace,
			autoload: 'inc/',
			outputDir: '.generated/php',
		},
	} satisfies IRv1;
}

describe('createPatcher', () => {
	function buildOutput(): BuilderOutput {
		const actions: BuilderOutput['actions'] = [];
		return {
			actions,
			queueWrite: (action) => {
				actions.push(action);
			},
		};
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

	it('applies git merge patches and records manifest', async () => {
		await withWorkspace(async (workspaceRoot) => {
			const workspace = buildWorkspace(workspaceRoot);
			const reporter = buildReporter();
			const output = buildOutput();

			const baseContents = [
				'<?php',
				'class JobController {',
				'    public function handle() {}',
				'}',
				'',
			].join('\n');
			const incomingContents = [
				'<?php',
				"require_once __DIR__ . '/../.generated/php/Rest/JobController.php';",
				'class JobController extends \\WPKernel\\Generated\\Rest\\JobController {',
				'    public function handle() {',
				'        parent::handle();',
				'    }',
				'}',
				'',
			].join('\n');

			await workspace.write(
				path.posix.join('.wpk', 'apply', 'plan.json'),
				JSON.stringify(
					{
						instructions: [
							{
								file: 'php/JobController.php',
								base: '.wpk/apply/base/php/JobController.php',
								incoming:
									'.wpk/apply/incoming/php/JobController.php',
								description: 'Update Job controller shim',
							},
						],
					},
					null,
					2
				)
			);

			await workspace.write(
				path.posix.join(
					'.wpk',
					'apply',
					'base',
					'php',
					'JobController.php'
				),
				baseContents
			);
			await workspace.write(
				path.posix.join(
					'.wpk',
					'apply',
					'incoming',
					'php',
					'JobController.php'
				),
				incomingContents
			);
			await workspace.write('php/JobController.php', baseContents, {
				ensureDir: true,
			});

			const ir = buildIr('Demo');
			const input = {
				phase: 'apply' as const,
				options: {
					config: ir.config,
					namespace: ir.meta.namespace,
					origin: ir.meta.origin,
					sourcePath: path.join(workspaceRoot, 'kernel.config.ts'),
				},
				ir,
			};

			const builder = createPatcher();
			await builder.apply(
				{
					context: {
						workspace,
						reporter,
						phase: 'apply' as const,
					},
					input,
					output,
					reporter,
				},
				undefined
			);

			const updated = await workspace.readText('php/JobController.php');
			expect(updated).toBe(incomingContents);

			const manifestPath = path.posix.join(
				'.wpk',
				'apply',
				'manifest.json'
			);
			const manifestRaw = await workspace.readText(manifestPath);
			expect(manifestRaw).toBeTruthy();
			const manifest = JSON.parse(manifestRaw ?? '{}');
			expect(manifest.summary).toEqual({
				applied: 1,
				conflicts: 0,
				skipped: 0,
			});
			expect(manifest.records).toEqual([
				expect.objectContaining({
					file: 'php/JobController.php',
					status: 'applied',
					description: 'Update Job controller shim',
				}),
			]);

			expect(output.actions.map((action) => action.file)).toEqual(
				expect.arrayContaining(['php/JobController.php', manifestPath])
			);
			expect(reporter.info).toHaveBeenCalledWith(
				'createPatcher: completed patch application.',
				expect.objectContaining({ summary: expect.any(Object) })
			);
		});
	});

	it('records conflicts when merge cannot be resolved automatically', async () => {
		await withWorkspace(async (workspaceRoot) => {
			const workspace = buildWorkspace(workspaceRoot);
			const reporter = buildReporter();
			const output = buildOutput();

			const base = ['line-one', 'line-two', ''].join('\n');
			const incoming = ['line-one updated', 'line-two', ''].join('\n');
			const current = ['line-one user', 'line-two', ''].join('\n');

			await workspace.write(
				path.posix.join('.wpk', 'apply', 'plan.json'),
				JSON.stringify(
					{
						instructions: [
							{
								file: 'php/Conflict.php',
								base: '.wpk/apply/base/php/Conflict.php',
								incoming:
									'.wpk/apply/incoming/php/Conflict.php',
							},
						],
					},
					null,
					2
				)
			);

			await workspace.write(
				path.posix.join('.wpk', 'apply', 'base', 'php', 'Conflict.php'),
				base
			);
			await workspace.write(
				path.posix.join(
					'.wpk',
					'apply',
					'incoming',
					'php',
					'Conflict.php'
				),
				incoming
			);
			await workspace.write('php/Conflict.php', current, {
				ensureDir: true,
			});

			const ir = buildIr('Demo');
			const input = {
				phase: 'apply' as const,
				options: {
					config: ir.config,
					namespace: ir.meta.namespace,
					origin: ir.meta.origin,
					sourcePath: path.join(workspaceRoot, 'kernel.config.ts'),
				},
				ir,
			};

			const builder = createPatcher();
			await builder.apply(
				{
					context: {
						workspace,
						reporter,
						phase: 'apply' as const,
					},
					input,
					output,
					reporter,
				},
				undefined
			);

			const merged = await workspace.readText('php/Conflict.php');
			expect(merged).toContain('<<<<<<<');
			expect(merged).toContain('=======');
			expect(merged).toContain('>>>>>>>');

			const manifestRaw = await workspace.readText(
				path.posix.join('.wpk', 'apply', 'manifest.json')
			);
			const manifest = JSON.parse(manifestRaw ?? '{}');
			expect(manifest.summary).toEqual({
				applied: 0,
				conflicts: 1,
				skipped: 0,
			});
			expect(reporter.warn).toHaveBeenCalledWith(
				'createPatcher: merge conflict detected.',
				expect.objectContaining({ file: 'php/Conflict.php' })
			);
		});
	});

	it('skips when no plan is present', async () => {
		await withWorkspace(async (workspaceRoot) => {
			const workspace = buildWorkspace(workspaceRoot);
			const reporter = buildReporter();
			const output = buildOutput();

			const ir = buildIr('Demo');
			const input = {
				phase: 'apply' as const,
				options: {
					config: ir.config,
					namespace: ir.meta.namespace,
					origin: ir.meta.origin,
					sourcePath: path.join(workspaceRoot, 'kernel.config.ts'),
				},
				ir,
			};

			const builder = createPatcher();
			await builder.apply(
				{
					context: {
						workspace,
						reporter,
						phase: 'apply' as const,
					},
					input,
					output,
					reporter,
				},
				undefined
			);

			expect(reporter.debug).toHaveBeenCalledWith(
				'createPatcher: no patch instructions found.'
			);
			expect(output.actions).toHaveLength(0);
		});
	});

	it('skips entries with missing incoming artifacts', async () => {
		await withWorkspace(async (workspaceRoot) => {
			const workspace = buildWorkspace(workspaceRoot);
			const reporter = buildReporter();
			const output = buildOutput();

			await workspace.write(
				path.posix.join('.wpk', 'apply', 'plan.json'),
				JSON.stringify(
					{
						instructions: [
							{
								file: './',
								base: '.wpk/apply/base/placeholder.txt',
								incoming: '.wpk/apply/incoming/missing.txt',
								description: 'missing incoming',
							},
							{
								file: 'php/Skip.php',
								base: '.wpk/apply/base/php/Skip.php',
								incoming: '.wpk/apply/incoming/php/Skip.php',
								description: 'missing incoming file',
							},
						],
					},
					null,
					2
				)
			);

			await workspace.write(
				path.posix.join('.wpk', 'apply', 'base', 'php', 'Skip.php'),
				'base'
			);

			const ir = buildIr('Demo');
			const input = {
				phase: 'apply' as const,
				options: {
					config: ir.config,
					namespace: ir.meta.namespace,
					origin: ir.meta.origin,
					sourcePath: path.join(workspaceRoot, 'kernel.config.ts'),
				},
				ir,
			};

			const builder = createPatcher();
			await builder.apply(
				{
					context: {
						workspace,
						reporter,
						phase: 'apply' as const,
					},
					input,
					output,
					reporter,
				},
				undefined
			);

			const manifestRaw = await workspace.readText(
				path.posix.join('.wpk', 'apply', 'manifest.json')
			);
			const manifest = JSON.parse(manifestRaw ?? '{}');
			expect(manifest.summary).toEqual({
				applied: 0,
				conflicts: 0,
				skipped: 2,
			});
			expect(manifest.records).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						status: 'skipped',
						description: 'missing incoming',
						details: { reason: 'empty-target' },
					}),
					expect.objectContaining({
						file: 'php/Skip.php',
						status: 'skipped',
						details: { reason: 'missing-incoming' },
					}),
				])
			);
			expect(reporter.warn).toHaveBeenCalled();
		});
	});

	it('skips when incoming matches the current target', async () => {
		await withWorkspace(async (workspaceRoot) => {
			const workspace = buildWorkspace(workspaceRoot);
			const reporter = buildReporter();
			const output = buildOutput();

			const sharedContents = ['<?php', 'echo "noop";', ''].join('\n');

			await workspace.write(
				path.posix.join('.wpk', 'apply', 'plan.json'),
				JSON.stringify(
					{
						instructions: [
							{
								file: 'php/Noop.php',
								base: '.wpk/apply/base/php/Noop.php',
								incoming: '.wpk/apply/incoming/php/Noop.php',
								description: 'noop check',
							},
						],
					},
					null,
					2
				)
			);

			await workspace.write(
				path.posix.join('.wpk', 'apply', 'base', 'php', 'Noop.php'),
				sharedContents
			);
			await workspace.write(
				path.posix.join('.wpk', 'apply', 'incoming', 'php', 'Noop.php'),
				sharedContents
			);
			await workspace.write('php/Noop.php', sharedContents, {
				ensureDir: true,
			});

			const ir = buildIr('Demo');
			const input = {
				phase: 'apply' as const,
				options: {
					config: ir.config,
					namespace: ir.meta.namespace,
					origin: ir.meta.origin,
					sourcePath: path.join(workspaceRoot, 'kernel.config.ts'),
				},
				ir,
			};

			const builder = createPatcher();
			await builder.apply(
				{
					context: {
						workspace,
						reporter,
						phase: 'apply' as const,
					},
					input,
					output,
					reporter,
				},
				undefined
			);

			const manifestRaw = await workspace.readText(
				path.posix.join('.wpk', 'apply', 'manifest.json')
			);
			const manifest = JSON.parse(manifestRaw ?? '{}');
			expect(manifest.summary).toEqual({
				applied: 0,
				conflicts: 0,
				skipped: 1,
			});
			expect(manifest.records[0]).toMatchObject({
				file: 'php/Noop.php',
				status: 'skipped',
				details: { reason: 'no-op' },
			});
		});
	});

	it('throws a kernel error when the plan JSON is invalid', async () => {
		await withWorkspace(async (workspaceRoot) => {
			const workspace = buildWorkspace(workspaceRoot);
			const reporter = buildReporter();
			const output = buildOutput();

			await workspace.write(
				path.posix.join('.wpk', 'apply', 'plan.json'),
				'{ invalid json ]'
			);

			const ir = buildIr('Demo');
			const input = {
				phase: 'apply' as const,
				options: {
					config: ir.config,
					namespace: ir.meta.namespace,
					origin: ir.meta.origin,
					sourcePath: path.join(workspaceRoot, 'kernel.config.ts'),
				},
				ir,
			};

			const builder = createPatcher();
			await expect(
				builder.apply(
					{
						context: {
							workspace,
							reporter,
							phase: 'apply' as const,
						},
						input,
						output,
						reporter,
					},
					undefined
				)
			).rejects.toMatchObject({ name: 'KernelError' });
		});
	});
});
