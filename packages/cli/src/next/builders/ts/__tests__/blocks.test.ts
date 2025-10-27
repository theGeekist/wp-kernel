import path from 'node:path';
import { createJsBlocksBuilder } from '../blocks';
import type { IRv1 } from '../../../../ir/types';
import {
	withWorkspace,
	buildKernelConfigSource,
	buildBuilderArtifacts,
	buildReporter,
	buildOutput,
	normalise,
} from '@wpkernel/test-utils/next/builders/tests/ts.test-support';

describe('createJsBlocksBuilder', () => {
	it('emits registrar and stubs for js-only blocks', async () => {
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
						viewScriptModule: 'file:./view.ts',
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
						hasRender: false,
						manifestSource: manifestPath,
					},
				],
			};

			const reporter = buildReporter();
			const output = buildOutput();
			const builder = createJsBlocksBuilder();

			await builder.apply(
				{
					context: { workspace, phase: 'generate', reporter },
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

			await expect(
				workspace.readText(
					path.join('src', 'blocks', 'example', 'view.ts')
				)
			).resolves.toContain('AUTO-GENERATED WPK STUB');
			await expect(
				workspace.readText(
					path.join('.generated', 'blocks', 'auto-register.ts')
				)
			).resolves.toContain('registerBlockType');

			expect(
				output.actions.map((action) => normalise(action.file)).sort()
			).toEqual([
				'.generated/blocks/auto-register.ts',
				'src/blocks/example/view.ts',
			]);
		});
	});

	it('writes empty registrar when blocks rely on file modules', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const configSource = buildKernelConfigSource();
			await workspace.write('kernel.config.ts', configSource);

			const blockDir = path.join('src', 'blocks', 'module');
			const manifestPath = path.join(blockDir, 'block.json');
			await workspace.write(
				manifestPath,
				JSON.stringify(
					{
						name: 'demo/module',
						title: 'Module Block',
						icon: 'smiley',
						category: 'widgets',
						editorScriptModule: 'file:./index.js',
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
						key: 'demo/module',
						directory: blockDir,
						hasRender: false,
						manifestSource: manifestPath,
					},
				],
			};

			const reporter = buildReporter();
			const output = buildOutput();
			const builder = createJsBlocksBuilder();

			await builder.apply(
				{
					context: { workspace, phase: 'generate', reporter },
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

			await expect(
				workspace.readText(
					path.join('.generated', 'blocks', 'auto-register.ts')
				)
			).resolves.toContain(
				'No JS-only blocks require auto-registration.'
			);
			await expect(
				workspace.exists(
					path.join('src', 'blocks', 'module', 'index.js')
				)
			).resolves.toBe(false);
			expect(output.actions.map((action) => action.file)).toEqual([
				path.join('.generated', 'blocks', 'auto-register.ts'),
			]);
		});
	});
	it('does not overwrite existing stubs when present', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const configSource = buildKernelConfigSource();
			await workspace.write('kernel.config.ts', configSource);

			const blockDir = path.join('src', 'blocks', 'existing');
			const manifestPath = path.join(blockDir, 'block.json');
			await workspace.write(
				manifestPath,
				JSON.stringify(
					{
						name: 'demo/existing',
						title: 'Existing Block',
						icon: 'admin-site',
						category: 'widgets',
						editorScriptModule: 'file:./index.tsx',
					},
					null,
					2
				)
			);
			await workspace.write(
				path.join(blockDir, 'index.tsx'),
				'// pre-existing editor implementation\n'
			);

			const { ir, options } = buildBuilderArtifacts({
				sourcePath: path.join(root, 'kernel.config.ts'),
			});
			const irWithBlocks: IRv1 = {
				...ir,
				blocks: [
					{
						key: 'demo/existing',
						directory: blockDir,
						hasRender: false,
						manifestSource: manifestPath,
					},
				],
			};

			const reporter = buildReporter();
			const output = buildOutput();

			await createJsBlocksBuilder().apply(
				{
					context: { workspace, phase: 'generate', reporter },
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

			await expect(
				workspace.readText(
					path.join('src', 'blocks', 'existing', 'index.tsx')
				)
			).resolves.toContain('pre-existing');
			expect(output.actions.map((action) => action.file)).toEqual([
				path.join('.generated', 'blocks', 'auto-register.ts'),
			]);
		});
	});

	it('skips generation when manifest cannot be processed', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const configSource = buildKernelConfigSource();
			await workspace.write('kernel.config.ts', configSource);

			const blockDir = path.join('src', 'blocks', 'invalid');
			const manifestPath = path.join(blockDir, 'block.json');
			await workspace.write(manifestPath, '{ invalid json');

			const { ir, options } = buildBuilderArtifacts({
				sourcePath: path.join(root, 'kernel.config.ts'),
			});
			const irWithBlocks: IRv1 = {
				...ir,
				blocks: [
					{
						key: 'demo/invalid',
						directory: blockDir,
						hasRender: false,
						manifestSource: manifestPath,
					},
				],
			};

			const reporter = buildReporter();
			const output = buildOutput();

			await createJsBlocksBuilder().apply(
				{
					context: { workspace, phase: 'generate', reporter },
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

			expect(output.actions).toHaveLength(0);
			expect(reporter.debug).toHaveBeenCalledWith(
				'createJsBlocksBuilder: no auto-register artifacts generated.'
			);
		});
	});

	it('logs debug when no JS-only blocks are present', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const configSource = buildKernelConfigSource();
			await workspace.write('kernel.config.ts', configSource);

			const blockDir = path.join('src', 'blocks', 'ssr');
			const manifestPath = path.join(blockDir, 'block.json');
			await workspace.write(
				manifestPath,
				JSON.stringify(
					{
						name: 'demo/ssr',
						title: 'SSR Block',
						icon: 'smiley',
						category: 'widgets',
						render: 'file:./render.php',
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
						key: 'demo/ssr',
						directory: blockDir,
						hasRender: true,
						manifestSource: manifestPath,
					},
				],
			};

			const reporter = buildReporter();
			const output = buildOutput();

			await createJsBlocksBuilder().apply(
				{
					context: { workspace, phase: 'generate', reporter },
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

			expect(output.actions).toHaveLength(0);
			expect(reporter.debug).toHaveBeenCalledWith(
				'createJsBlocksBuilder: no JS-only blocks discovered.'
			);
		});
	});

	it('ignores non-generate phases', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const configSource = buildKernelConfigSource();
			await workspace.write('kernel.config.ts', configSource);

			const { ir, options } = buildBuilderArtifacts({
				sourcePath: path.join(root, 'kernel.config.ts'),
			});

			const reporter = buildReporter();
			const output = buildOutput();

			await createJsBlocksBuilder().apply(
				{
					context: { workspace, phase: 'init', reporter },
					input: {
						phase: 'init',
						options,
						ir,
					},
					output,
					reporter,
				},
				undefined
			);

			expect(output.actions).toHaveLength(0);
			expect(reporter.debug).not.toHaveBeenCalled();
		});
	});

	it('skips when IR is missing', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const configSource = buildKernelConfigSource();
			await workspace.write('kernel.config.ts', configSource);

			const { options } = buildBuilderArtifacts({
				sourcePath: path.join(root, 'kernel.config.ts'),
			});

			const reporter = buildReporter();
			const output = buildOutput();
			const next = jest.fn();

			await createJsBlocksBuilder().apply(
				{
					context: { workspace, phase: 'generate', reporter },
					input: {
						phase: 'generate',
						options,
						ir: null,
					},
					output,
					reporter,
				},
				next
			);

			expect(next).toHaveBeenCalled();
			expect(output.actions).toHaveLength(0);
		});
	});

	it('uses staged contents when workspace read returns null', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const configSource = buildKernelConfigSource();
			await workspace.write('kernel.config.ts', configSource);

			const blockDir = path.join('src', 'blocks', 'null-read');
			const manifestPath = path.join(blockDir, 'block.json');
			await workspace.write(
				manifestPath,
				JSON.stringify(
					{
						name: 'demo/null-read',
						title: 'Null Read Block',
						icon: 'smiley',
						category: 'widgets',
						editorScript: 'build/editor.js',
						viewScriptModule: 'file:./view.ts',
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
						key: 'demo/null-read',
						directory: blockDir,
						hasRender: false,
						manifestSource: manifestPath,
					},
				],
			};

			const reporter = buildReporter();
			const output = buildOutput();
			const originalRead = workspace.read.bind(workspace);
			const stubRelative = normalise(
				path.join('src', 'blocks', 'null-read', 'view.ts')
			);
			let intercepted = false;
			const readSpy = jest
				.spyOn(workspace, 'read')
				.mockImplementation(async (file) => {
					const candidate = normalise(String(file));
					if (!intercepted && candidate.endsWith(stubRelative)) {
						intercepted = true;
						return null;
					}

					return originalRead(file);
				});

			await createJsBlocksBuilder().apply(
				{
					context: { workspace, phase: 'generate', reporter },
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

			readSpy.mockRestore();
			expect(intercepted).toBe(true);

			expect(
				output.actions.map((action) => normalise(action.file)).sort()
			).toEqual([
				'.generated/blocks/auto-register.ts',
				'src/blocks/null-read/view.ts',
			]);
			await expect(
				workspace.exists(
					path.join('src', 'blocks', 'null-read', 'view.ts')
				)
			).resolves.toBe(true);
			expect(reporter.debug).toHaveBeenCalledWith(
				'createJsBlocksBuilder: emitted block stubs.',
				expect.objectContaining({ files: expect.any(Array) })
			);
		});
	});

	it('rolls back stub writes when a filesystem error occurs', async () => {
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
						editorScriptModule: 'file:./index.tsx',
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
						hasRender: false,
						manifestSource: manifestPath,
					},
				],
			};

			const reporter = buildReporter();
			const output = buildOutput();
			const writeSpy = jest
				.spyOn(workspace, 'write')
				.mockImplementationOnce(async () => {
					throw new Error('stub failure');
				});
			const rollbackSpy = jest.spyOn(workspace, 'rollback');

			await expect(
				createJsBlocksBuilder().apply(
					{
						context: { workspace, phase: 'generate', reporter },
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
			).rejects.toThrow('stub failure');

			expect(rollbackSpy).toHaveBeenCalled();
			writeSpy.mockRestore();
			rollbackSpy.mockRestore();
		});
	});
});
