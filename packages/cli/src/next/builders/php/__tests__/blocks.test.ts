import path from 'node:path';
import { createPhpBlocksHelper } from '../blocks';
import { getPhpBuilderChannel, resetPhpBuilderChannel } from '../channel';
import type { IRv1 } from '../../../../ir/types';
import {
	withWorkspace,
	buildKernelConfigSource,
	buildBuilderArtifacts,
	buildReporter,
	buildOutput,
	normalise,
} from '@wpkernel/test-utils/next/builders/tests/ts.test-support';

describe('createPhpBlocksHelper', () => {
	it('emits manifest, registrar, and render stub for SSR blocks', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const configSource = buildKernelConfigSource();
			await workspace.write('kernel.config.ts', configSource);

			const blockDir = path.join('src', 'blocks', 'example');
			const manifestPath = path.join(blockDir, 'block.json');
			await workspace.write(
				manifestPath,
				JSON.stringify(
					{
						name: 'demo/example',
						title: 'Example Block',
						icon: 'smiley',
						category: 'widgets',
						editorScript: 'build/editor.js',
					},
					null,
					2
				)
			);

			const { ir, options } = buildBuilderArtifacts({
				sourcePath: path.join(root, 'kernel.config.ts'),
			});
			const irWithBlocks: IRv1 = {
				...ir,
				blocks: [
					{
						key: 'demo/example',
						directory: blockDir,
						hasRender: true,
						manifestSource: manifestPath,
					},
				],
			};

			const reporter = buildReporter();
			const context = { workspace, phase: 'generate' as const, reporter };
			resetPhpBuilderChannel(context);
			const output = buildOutput();

			await createPhpBlocksHelper().apply(
				{
					context,
					input: {
						phase: 'generate',
						options,
						ir: irWithBlocks,
					},
					output,
					reporter,
				},
				undefined
			);

			const pending = getPhpBuilderChannel(context).pending();
			expect(
				pending.map((action) => normalise(action.file)).sort()
			).toEqual([
				'.generated/build/blocks-manifest.php',
				'.generated/php/Blocks/Register.php',
			]);

			const manifestAction = pending.find(
				(action) => action.metadata.kind === 'block-manifest'
			);
			const registrarAction = pending.find(
				(action) => action.metadata.kind === 'block-registrar'
			);

			expect(manifestAction).toBeDefined();
			expect(manifestAction?.program.length ?? 0).toBeGreaterThan(0);
			expect(registrarAction).toBeDefined();
			const registrarProgram = JSON.stringify(
				registrarAction?.program ?? []
			);
			expect(registrarProgram).toContain('Stmt_Class');
			await expect(
				workspace.readText(
					path.join('src', 'blocks', 'example', 'render.php')
				)
			).resolves.toContain('AUTO-GENERATED WPK STUB');

			expect(reporter.warn).toHaveBeenCalledWith(
				expect.stringContaining('render template was not declared')
			);
			expect(reporter.debug).toHaveBeenCalledWith(
				'createPhpBlocksHelper: queued SSR block manifest and registrar.'
			);

			expect(
				output.actions.map((action) => normalise(action.file)).sort()
			).toEqual(['src/blocks/example/render.php']);
		});
	});

	it('skips when SSR blocks are absent', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const configSource = buildKernelConfigSource();
			await workspace.write('kernel.config.ts', configSource);

			const { options, ir } = buildBuilderArtifacts({
				sourcePath: path.join(root, 'kernel.config.ts'),
			});

			const reporter = buildReporter();
			const context = { workspace, phase: 'generate' as const, reporter };
			resetPhpBuilderChannel(context);
			const output = buildOutput();

			await createPhpBlocksHelper().apply(
				{
					context,
					input: {
						phase: 'generate',
						options,
						ir: { ...ir, blocks: [] },
					},
					output,
					reporter,
				},
				undefined
			);

			expect(reporter.debug).toHaveBeenCalledWith(
				'createPhpBlocksHelper: no SSR blocks discovered.'
			);
			expect(output.actions).toHaveLength(0);
			expect(getPhpBuilderChannel(context).pending()).toHaveLength(0);
		});
	});

	it('skips manifest emission when entries are missing', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const configSource = buildKernelConfigSource();
			await workspace.write('kernel.config.ts', configSource);

			const blockDir = path.join('src', 'blocks', 'broken');
			const manifestPath = path.join(blockDir, 'block.json');
			await workspace.write(manifestPath, '{ invalid json');

			const { ir, options } = buildBuilderArtifacts({
				sourcePath: path.join(root, 'kernel.config.ts'),
			});
			const irWithBlocks: IRv1 = {
				...ir,
				blocks: [
					{
						key: 'demo/broken',
						directory: blockDir,
						hasRender: true,
						manifestSource: manifestPath,
					},
				],
			};

			const reporter = buildReporter();
			const context = { workspace, phase: 'generate' as const, reporter };
			resetPhpBuilderChannel(context);
			const output = buildOutput();

			await createPhpBlocksHelper().apply(
				{
					context,
					input: {
						phase: 'generate',
						options,
						ir: irWithBlocks,
					},
					output,
					reporter,
				},
				undefined
			);

			expect(reporter.warn).toHaveBeenCalledWith(
				expect.stringContaining('Invalid JSON in block manifest')
			);
			expect(reporter.debug).toHaveBeenCalledWith(
				'createPhpBlocksHelper: no manifest entries produced.'
			);
			expect(output.actions).toHaveLength(0);
			expect(getPhpBuilderChannel(context).pending()).toHaveLength(0);
		});
	});

	it('rolls back render stub writes when workspace write fails', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const configSource = buildKernelConfigSource();
			await workspace.write('kernel.config.ts', configSource);

			const blockDir = path.join('src', 'blocks', 'failing');
			const manifestPath = path.join(blockDir, 'block.json');
			await workspace.write(
				manifestPath,
				JSON.stringify(
					{
						name: 'demo/failing',
						title: 'Failing Block',
						icon: 'smiley',
						category: 'widgets',
						editorScript: 'build/editor.js',
					},
					null,
					2
				)
			);

			const { ir, options } = buildBuilderArtifacts({
				sourcePath: path.join(root, 'kernel.config.ts'),
			});
			const irWithBlocks: IRv1 = {
				...ir,
				blocks: [
					{
						key: 'demo/failing',
						directory: blockDir,
						hasRender: true,
						manifestSource: manifestPath,
					},
				],
			};

			const reporter = buildReporter();
			const context = { workspace, phase: 'generate' as const, reporter };
			resetPhpBuilderChannel(context);
			const output = buildOutput();

			const rollbackSpy = jest.spyOn(workspace, 'rollback');
			const originalWrite = workspace.write.bind(workspace);
			const writeSpy = jest
				.spyOn(workspace, 'write')
				.mockImplementationOnce(async (file, data, writeOptions) => {
					if (
						typeof file === 'string' &&
						file.includes('render.php')
					) {
						throw new Error('render stub failure');
					}

					return originalWrite(file, data, writeOptions);
				});

			await expect(
				createPhpBlocksHelper().apply(
					{
						context,
						input: {
							phase: 'generate',
							options,
							ir: irWithBlocks,
						},
						output,
						reporter,
					},
					undefined
				)
			).rejects.toThrow('render stub failure');

			expect(rollbackSpy).toHaveBeenCalledWith(
				'builder.generate.php.blocks.render'
			);
			expect(output.actions).toHaveLength(0);
			expect(getPhpBuilderChannel(context).pending()).toHaveLength(0);

			writeSpy.mockRestore();
			rollbackSpy.mockRestore();
		});
	});
});
