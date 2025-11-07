import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { buildWorkspace } from '../../workspace';
import { createPatcher } from '../patcher';
import type { BuilderOutput } from '../../runtime/types';
import type { IRv1 } from '../../ir/publicTypes';
import { buildEmptyGenerationState } from '../../apply/manifest';
import { AUTO_GUARD_BEGIN, AUTO_GUARD_END } from '@wpkernel/wp-json-ast';

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
			origin: 'wpk.config.ts',
			sourcePath: 'wpk.config.ts',
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
		capabilities: [],
		capabilityMap: {
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
								action: 'write',
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
					sourcePath: path.join(workspaceRoot, 'wpk.config.ts'),
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
						generationState: buildEmptyGenerationState(),
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
			const basePath = path.posix.join(
				'.wpk',
				'apply',
				'base',
				'php',
				'JobController.php'
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
			expect(manifest.actions).toEqual(
				expect.arrayContaining([
					'php/JobController.php',
					manifestPath,
					basePath,
				])
			);

			expect(output.actions.map((action) => action.file)).toEqual(
				expect.arrayContaining([
					'php/JobController.php',
					manifestPath,
					basePath,
				])
			);
			const updatedBase = await workspace.readText(basePath);
			expect(updatedBase).toBe(incomingContents);
			expect(reporter.info).toHaveBeenCalledWith(
				'createPatcher: completed patch application.',
				expect.objectContaining({ summary: expect.any(Object) })
			);
		});
	});

	it('applies plugin loader updates when the guard is intact', async () => {
		await withWorkspace(async (workspaceRoot) => {
			const workspace = buildWorkspace(workspaceRoot);
			const reporter = buildReporter();
			const output = buildOutput();

			const baseLoader = [
				'<?php',
				`// ${AUTO_GUARD_BEGIN}`,
				"require_once __DIR__ . '/generated.php';",
				`// ${AUTO_GUARD_END}`,
				'',
			].join('\n');
			const incomingLoader = [
				'<?php',
				`// ${AUTO_GUARD_BEGIN}`,
				"require_once __DIR__ . '/generated.php';",
				'bootstrap_kernel();',
				`// ${AUTO_GUARD_END}`,
				'',
			].join('\n');

			await workspace.write(
				path.posix.join('.wpk', 'apply', 'plan.json'),
				JSON.stringify(
					{
						instructions: [
							{
								action: 'write',
								file: 'plugin.php',
								base: '.wpk/apply/base/plugin.php',
								incoming: '.wpk/apply/incoming/plugin.php',
								description: 'Update plugin loader',
							},
						],
					},
					null,
					2
				)
			);

			await workspace.write(
				path.posix.join('.wpk', 'apply', 'base', 'plugin.php'),
				baseLoader,
				{ ensureDir: true }
			);
			await workspace.write(
				path.posix.join('.wpk', 'apply', 'incoming', 'plugin.php'),
				incomingLoader,
				{ ensureDir: true }
			);
			await workspace.write('plugin.php', baseLoader, {
				ensureDir: true,
			});

			const ir = buildIr('Demo');
			const input = {
				phase: 'apply' as const,
				options: {
					config: ir.config,
					namespace: ir.meta.namespace,
					origin: ir.meta.origin,
					sourcePath: path.join(workspaceRoot, 'wpk.config.ts'),
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
						generationState: buildEmptyGenerationState(),
					},
					input,
					output,
					reporter,
				},
				undefined
			);

			const updated = await workspace.readText('plugin.php');
			expect(updated).toBe(incomingLoader);

			const baseSnapshot = await workspace.readText(
				path.posix.join('.wpk', 'apply', 'base', 'plugin.php')
			);
			expect(baseSnapshot).toBe(incomingLoader);

			const manifestPath = path.posix.join(
				'.wpk',
				'apply',
				'manifest.json'
			);
			const manifestRaw = await workspace.readText(manifestPath);
			const manifest = JSON.parse(manifestRaw ?? '{}');
			expect(manifest.summary).toEqual({
				applied: 1,
				conflicts: 0,
				skipped: 0,
			});
			expect(manifest.records).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						file: 'plugin.php',
						status: 'applied',
					}),
				])
			);
		});
	});

	it('preserves custom loaders when the guard is missing', async () => {
		await withWorkspace(async (workspaceRoot) => {
			const workspace = buildWorkspace(workspaceRoot);
			const reporter = buildReporter();
			const output = buildOutput();

			const baseLoader = [
				'<?php',
				`// ${AUTO_GUARD_BEGIN}`,
				"require_once __DIR__ . '/generated.php';",
				`// ${AUTO_GUARD_END}`,
				'',
			].join('\n');
			const incomingLoader = [
				'<?php',
				`// ${AUTO_GUARD_BEGIN}`,
				"require_once __DIR__ . '/generated.php';",
				'bootstrap_kernel();',
				`// ${AUTO_GUARD_END}`,
				'',
			].join('\n');
			const customLoader = [
				'<?php',
				'// custom bootstrap',
				'do_custom_bootstrap();',
				'',
			].join('\n');

			await workspace.write(
				path.posix.join('.wpk', 'apply', 'plan.json'),
				JSON.stringify(
					{
						instructions: [
							{
								action: 'write',
								file: 'plugin.php',
								base: '.wpk/apply/base/plugin.php',
								incoming: '.wpk/apply/incoming/plugin.php',
								description: 'Update plugin loader',
							},
						],
					},
					null,
					2
				)
			);

			await workspace.write(
				path.posix.join('.wpk', 'apply', 'base', 'plugin.php'),
				baseLoader,
				{ ensureDir: true }
			);
			await workspace.write(
				path.posix.join('.wpk', 'apply', 'incoming', 'plugin.php'),
				incomingLoader,
				{ ensureDir: true }
			);
			await workspace.write('plugin.php', customLoader, {
				ensureDir: true,
			});

			const ir = buildIr('Demo');
			const input = {
				phase: 'apply' as const,
				options: {
					config: ir.config,
					namespace: ir.meta.namespace,
					origin: ir.meta.origin,
					sourcePath: path.join(workspaceRoot, 'wpk.config.ts'),
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
						generationState: buildEmptyGenerationState(),
					},
					input,
					output,
					reporter,
				},
				undefined
			);

			const merged = await workspace.readText('plugin.php');
			expect(merged).toContain('custom bootstrap');
			expect(merged).toContain('<<<<<<<');

			const baseSnapshot = await workspace.readText(
				path.posix.join('.wpk', 'apply', 'base', 'plugin.php')
			);
			expect(baseSnapshot).toBe(baseLoader);

			const manifestPath = path.posix.join(
				'.wpk',
				'apply',
				'manifest.json'
			);
			const manifestRaw = await workspace.readText(manifestPath);
			const manifest = JSON.parse(manifestRaw ?? '{}');
			expect(manifest.summary).toEqual({
				applied: 0,
				conflicts: 1,
				skipped: 0,
			});
			expect(manifest.records).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						file: 'plugin.php',
						status: 'conflict',
					}),
				])
			);
		});
	});

	it('merges shim updates while preserving user edits', async () => {
		await withWorkspace(async (workspaceRoot) => {
			const workspace = buildWorkspace(workspaceRoot);
			const reporter = buildReporter();
			const output = buildOutput();

			const baseContents = [
				'<?php',
				"require_once __DIR__ . '/../.generated/php/Rest/JobController.php';",
				'class JobController extends \\Demo\\Plugin\\Generated\\Rest\\JobController',
				'{',
				'}',
				'',
			].join('\n');
			const incomingContents = [
				'<?php',
				"require_once __DIR__ . '/../../.generated/php/Rest/JobController.php';",
				'class JobController extends \\Demo\\Plugin\\Generated\\Rest\\JobController',
				'{',
				'}',
				'',
			].join('\n');
			const currentContents = [
				'<?php',
				"require_once __DIR__ . '/../.generated/php/Rest/JobController.php';",
				'class JobController extends \\Demo\\Plugin\\Generated\\Rest\\JobController',
				'{',
				'    public function custom()',
				'    {',
				'        return true;',
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
								action: 'write',
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
			await workspace.write('php/JobController.php', currentContents, {
				ensureDir: true,
			});

			const ir = buildIr('Demo');
			const input = {
				phase: 'apply' as const,
				options: {
					config: ir.config,
					namespace: ir.meta.namespace,
					origin: ir.meta.origin,
					sourcePath: path.join(workspaceRoot, 'wpk.config.ts'),
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
						generationState: buildEmptyGenerationState(),
					},
					input,
					output,
					reporter,
				},
				undefined
			);

			const updated = await workspace.readText('php/JobController.php');
			expect(updated).toContain(
				"require_once __DIR__ . '/../../.generated/php/Rest/JobController.php';"
			);
			expect(updated).toContain('public function custom()');

			const manifestRaw = await workspace.readText(
				path.posix.join('.wpk', 'apply', 'manifest.json')
			);
			const manifest = JSON.parse(manifestRaw ?? '{}');
			expect(manifest.summary).toEqual({
				applied: 1,
				conflicts: 0,
				skipped: 0,
			});
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
								action: 'write',
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
					sourcePath: path.join(workspaceRoot, 'wpk.config.ts'),
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
						generationState: buildEmptyGenerationState(),
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

			const manifestPath = path.posix.join(
				'.wpk',
				'apply',
				'manifest.json'
			);
			const manifestRaw = await workspace.readText(manifestPath);
			const manifest = JSON.parse(manifestRaw ?? '{}');
			expect(manifest.summary).toEqual({
				applied: 0,
				conflicts: 1,
				skipped: 0,
			});
			expect(manifest.actions).toEqual(
				expect.arrayContaining(['php/Conflict.php', manifestPath])
			);
			expect(output.actions.map((action) => action.file)).toEqual(
				expect.arrayContaining(['php/Conflict.php', manifestPath])
			);
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
					sourcePath: path.join(workspaceRoot, 'wpk.config.ts'),
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
						generationState: buildEmptyGenerationState(),
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
								action: 'write',
								file: './',
								base: '.wpk/apply/base/placeholder.txt',
								incoming: '.wpk/apply/incoming/missing.txt',
								description: 'missing incoming',
							},
							{
								action: 'write',
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
					sourcePath: path.join(workspaceRoot, 'wpk.config.ts'),
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
						generationState: buildEmptyGenerationState(),
					},
					input,
					output,
					reporter,
				},
				undefined
			);

			const manifestPath = path.posix.join(
				'.wpk',
				'apply',
				'manifest.json'
			);
			const manifestRaw = await workspace.readText(manifestPath);
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
			expect(manifest.actions).toEqual([manifestPath]);
			expect(output.actions.map((action) => action.file)).toEqual([
				manifestPath,
			]);
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
								action: 'write',
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
					sourcePath: path.join(workspaceRoot, 'wpk.config.ts'),
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
						generationState: buildEmptyGenerationState(),
					},
					input,
					output,
					reporter,
				},
				undefined
			);

			const manifestPath = path.posix.join(
				'.wpk',
				'apply',
				'manifest.json'
			);
			const manifestRaw = await workspace.readText(manifestPath);
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
			expect(manifest.actions).toEqual([manifestPath]);
			expect(output.actions.map((action) => action.file)).toEqual([
				manifestPath,
			]);
		});
	});

	it('applies deletion instructions for stale shims', async () => {
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
								action: 'delete',
								file: 'php/Stale.php',
								description: 'Remove stale shim',
							},
						],
					},
					null,
					2
				)
			);

			await workspace.write(
				path.posix.join('.wpk', 'apply', 'base', 'php', 'Stale.php'),
				'<?php',
				{ ensureDir: true }
			);
			await workspace.write('php/Stale.php', '<?php', {
				ensureDir: true,
			});

			const ir = buildIr('Demo');
			const input = {
				phase: 'apply' as const,
				options: {
					config: ir.config,
					namespace: ir.meta.namespace,
					origin: ir.meta.origin,
					sourcePath: path.join(workspaceRoot, 'wpk.config.ts'),
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
						generationState: buildEmptyGenerationState(),
					},
					input,
					output,
					reporter,
				},
				undefined
			);

			const exists = await workspace.exists('php/Stale.php');
			expect(exists).toBe(false);

			const manifestPath = path.posix.join(
				'.wpk',
				'apply',
				'manifest.json'
			);
			const manifestRaw = await workspace.readText(manifestPath);
			const manifest = JSON.parse(manifestRaw ?? '{}');
			expect(manifest.summary).toEqual({
				applied: 1,
				conflicts: 0,
				skipped: 0,
			});
			expect(manifest.records).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						file: 'php/Stale.php',
						status: 'applied',
						details: { action: 'delete' },
					}),
				])
			);
			expect(manifest.actions).toEqual(
				expect.arrayContaining([manifestPath, 'php/Stale.php'])
			);
			expect(output.actions.map((action) => action.file)).toEqual([
				manifestPath,
			]);
		});
	});

	it('skips shim deletion when the target differs from the base snapshot', async () => {
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
								action: 'delete',
								file: 'php/Edited.php',
								description: 'Remove edited shim',
							},
						],
					},
					null,
					2
				)
			);

			const baseContents = '<?php // base shim\n';
			const editedContents = [
				'<?php // base shim',
				'// author edit',
			].join('\n');
			await workspace.write(
				path.posix.join('.wpk', 'apply', 'base', 'php', 'Edited.php'),
				baseContents,
				{ ensureDir: true }
			);
			await workspace.write('php/Edited.php', editedContents, {
				ensureDir: true,
			});

			const ir = buildIr('Demo');
			const input = {
				phase: 'apply' as const,
				options: {
					config: ir.config,
					namespace: ir.meta.namespace,
					origin: ir.meta.origin,
					sourcePath: path.join(workspaceRoot, 'wpk.config.ts'),
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
						generationState: buildEmptyGenerationState(),
					},
					input,
					output,
					reporter,
				},
				undefined
			);

			const manifestPath = path.posix.join(
				'.wpk',
				'apply',
				'manifest.json'
			);
			const manifestRaw = await workspace.readText(manifestPath);
			const manifest = JSON.parse(manifestRaw ?? '{}');
			expect(manifest.summary).toEqual({
				applied: 0,
				conflicts: 0,
				skipped: 1,
			});
			expect(manifest.records).toEqual([
				expect.objectContaining({
					file: 'php/Edited.php',
					status: 'skipped',
					details: { reason: 'modified-target', action: 'delete' },
				}),
			]);

			const exists = await workspace.readText('php/Edited.php');
			expect(exists).toBe(editedContents);
		});
	});

	it('records planned deletion skips in the manifest', async () => {
		await withWorkspace(async (workspaceRoot) => {
			const workspace = buildWorkspace(workspaceRoot);
			const reporter = buildReporter();
			const output = buildOutput();

			await workspace.write(
				path.posix.join('.wpk', 'apply', 'plan.json'),
				JSON.stringify(
					{
						instructions: [],
						skippedDeletions: [
							{
								file: 'php/Legacy.php',
								description: 'Remove legacy shim',
								reason: 'modified-target',
							},
						],
					},
					null,
					2
				)
			);

			const ir = buildIr('Demo');
			const input = {
				phase: 'apply' as const,
				options: {
					config: ir.config,
					namespace: ir.meta.namespace,
					origin: ir.meta.origin,
					sourcePath: path.join(workspaceRoot, 'wpk.config.ts'),
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
						generationState: buildEmptyGenerationState(),
					},
					input,
					output,
					reporter,
				},
				undefined
			);

			const manifestPath = path.posix.join(
				'.wpk',
				'apply',
				'manifest.json'
			);
			const manifestRaw = await workspace.readText(manifestPath);
			const manifest = JSON.parse(manifestRaw ?? '{}');
			expect(manifest.summary).toEqual({
				applied: 0,
				conflicts: 0,
				skipped: 1,
			});
			expect(manifest.records).toEqual([
				expect.objectContaining({
					file: 'php/Legacy.php',
					status: 'skipped',
					description: 'Remove legacy shim',
					details: {
						action: 'delete',
						reason: 'modified-target',
					},
				}),
			]);
			expect(output.actions.map((action) => action.file)).toEqual([
				manifestPath,
			]);
		});
	});

	it('throws a wpk error when the plan JSON is invalid', async () => {
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
					sourcePath: path.join(workspaceRoot, 'wpk.config.ts'),
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
							generationState: buildEmptyGenerationState(),
						},
						input,
						output,
						reporter,
					},
					undefined
				)
			).rejects.toMatchObject({ name: 'WPKernelError' });
		});
	});
});
