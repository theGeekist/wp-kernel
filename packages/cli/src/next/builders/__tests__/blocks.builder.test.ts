import path from 'node:path';
import fs from 'node:fs/promises';
import { createBlocksBuilder } from '../blocks';
import { withBuilderWorkspace } from '../tests/workspace.test-support';
import { createReporter, createOutput } from '../tests/ts.test-support';

describe('createBlocksBuilder', () => {
	function createBuilderInput({
		sourcePath,
		blocks = [
			{
				key: 'demo/example',
				directory: 'src/blocks/example',
				hasRender: true,
				manifestSource: path.join(
					'src',
					'blocks',
					'example',
					'block.json'
				),
			},
			{
				key: 'demo/client',
				directory: 'src/blocks/client',
				hasRender: false,
				manifestSource: path.join(
					'src',
					'blocks',
					'client',
					'block.json'
				),
			},
		],
		phase = 'generate' as const,
	}: {
		readonly sourcePath: string;
		readonly blocks?: {
			readonly key: string;
			readonly directory: string;
			readonly hasRender: boolean;
			readonly manifestSource: string;
		}[];
		readonly phase?: 'generate' | 'apply';
	}) {
		return {
			phase,
			options: {
				namespace: 'demo-namespace',
				origin: 'kernel.config.ts',
				sourcePath,
				config: {
					version: 1,
					namespace: 'demo-namespace',
					schemas: {},
					resources: {},
				},
			},
			ir: {
				meta: {
					version: 1,
					namespace: 'demo-namespace',
					origin: 'kernel.config.ts',
					sanitizedNamespace: 'DemoNamespace',
					sourcePath: 'kernel.config.ts',
				},
				config: {
					version: 1,
					namespace: 'demo-namespace',
					schemas: {},
					resources: {},
				},
				schemas: [],
				resources: [],
				policies: [],
				policyMap: {
					sourcePath: undefined,
					definitions: [],
					fallback: {
						capability: 'manage_options',
						appliesTo: 'resource',
					},
					missing: [],
					unused: [],
					warnings: [],
				},
				blocks,
				php: {
					namespace: 'Demo\\Namespace',
					autoload: 'inc/',
					outputDir: '.generated/php',
				},
			},
		};
	}

	it('generates SSR manifests and JS registration files', async () => {
		await withBuilderWorkspace(async ({ workspace, root }) => {
			const blockDir = path.join(root, 'src', 'blocks', 'example');
			await fs.mkdir(blockDir, { recursive: true });

			const manifestPath = path.join(blockDir, 'block.json');
			await fs.writeFile(
				manifestPath,
				JSON.stringify(
					{
						name: 'demo/example',
						title: 'Example',
						category: 'widgets',
						icon: 'smiley',
						editorScriptModule: 'file:./index.tsx',
						render: 'file:./render.php',
					},
					null,
					2
				)
			);

			const renderPath = path.join(blockDir, 'render.php');
			await fs.writeFile(renderPath, '<?php return "Rendered";');

			const jsOnlyDir = path.join(root, 'src', 'blocks', 'client');
			await fs.mkdir(jsOnlyDir, { recursive: true });
			const jsOnlyManifest = path.join(jsOnlyDir, 'block.json');
			await fs.writeFile(
				jsOnlyManifest,
				JSON.stringify(
					{
						name: 'demo/client',
						title: 'Client',
						category: 'widgets',
						icon: 'admin-users',
						editorScriptModule: 'file:./index.tsx',
					},
					null,
					2
				)
			);
			const jsOnlyEntry = path.join(jsOnlyDir, 'index.tsx');
			await fs.writeFile(
				jsOnlyEntry,
				'export default function ClientBlock() { return null; }\n'
			);

			const builder = createBlocksBuilder();
			const reporter = createReporter();
			const output = createOutput();

			const sourcePath = path.join(root, 'kernel.config.ts');
			await fs.writeFile(sourcePath, 'export const kernelConfig = {};');

			const input = createBuilderInput({ sourcePath });

			await builder.apply(
				{
					context: { workspace, reporter, phase: 'generate' },
					input,
					output,
					reporter,
				},
				undefined
			);

			const manifestFile = path.join(
				root,
				'.generated',
				'build',
				'blocks-manifest.php'
			);
			const registrarFile = path.join(
				root,
				'.generated',
				'php',
				'Blocks',
				'Register.php'
			);
			const autoRegisterFile = path.join(
				root,
				'.generated',
				'blocks',
				'auto-register.ts'
			);

			await expect(fs.readFile(manifestFile, 'utf8')).resolves.toContain(
				"'demo/example'"
			);
			await expect(fs.readFile(registrarFile, 'utf8')).resolves.toContain(
				'register_block_type_from_metadata'
			);
			await expect(
				fs.readFile(autoRegisterFile, 'utf8')
			).resolves.toContain('registerGeneratedBlocks');

			const recordedFiles = output.actions.map((action) => action.file);
			expect(recordedFiles).toEqual(
				expect.arrayContaining([
					path.posix.join(
						'.generated',
						'build',
						'blocks-manifest.php'
					),
					path.posix.join(
						'.generated',
						'php',
						'Blocks',
						'Register.php'
					),
					path.posix.join('.generated', 'blocks', 'auto-register.ts'),
				])
			);

			const generationCall = (
				reporter.debug as jest.Mock
			).mock.calls.find(
				([message]) =>
					message ===
					'createBlocksBuilder: generated block artifacts.'
			);
			expect(generationCall).toBeDefined();
			const [, metadata] = generationCall as [
				string,
				{ files: string[]; warnings: number },
			];
			expect(metadata.files).toEqual(
				expect.arrayContaining([
					path.posix.join(
						'.generated',
						'build',
						'blocks-manifest.php'
					),
					path.posix.join(
						'.generated',
						'php',
						'Blocks',
						'Register.php'
					),
					path.posix.join('.generated', 'blocks', 'auto-register.ts'),
				])
			);
			expect(metadata.warnings).toBeGreaterThanOrEqual(0);
			expect(reporter.warn).toHaveBeenCalledTimes(metadata.warnings);
		});
	});

	it('skips non-generate phases and emits debug diagnostics', async () => {
		await withBuilderWorkspace(async ({ workspace, root }) => {
			const builder = createBlocksBuilder();
			const reporter = createReporter();
			const output = createOutput();

			const input = createBuilderInput({
				sourcePath: path.join(root, 'kernel.config.ts'),
				phase: 'apply',
			});

			await builder.apply(
				{
					context: { workspace, reporter, phase: 'apply' },
					input,
					output,
					reporter,
				},
				undefined
			);

			expect(output.actions).toHaveLength(0);
			expect(reporter.warn).not.toHaveBeenCalled();
			expect(reporter.debug).toHaveBeenCalledWith(
				'createBlocksBuilder: skipping non-generate phase.',
				{ phase: 'apply' }
			);
		});
	});

	it('logs a debug message when no blocks are registered', async () => {
		await withBuilderWorkspace(async ({ workspace, root }) => {
			const builder = createBlocksBuilder();
			const reporter = createReporter();
			const output = createOutput();
			const sourcePath = path.join(root, 'kernel.config.ts');

			const input = createBuilderInput({
				sourcePath,
				blocks: [],
			});

			await builder.apply(
				{
					context: { workspace, reporter, phase: 'generate' },
					input,
					output,
					reporter,
				},
				undefined
			);

			expect(output.actions).toHaveLength(0);
			expect(reporter.debug).toHaveBeenCalledWith(
				'createBlocksBuilder: no blocks registered in IR.'
			);
		});
	});

	it('reports warnings and avoids writes when block manifests are missing', async () => {
		await withBuilderWorkspace(async ({ workspace, root }) => {
			const builder = createBlocksBuilder();
			const reporter = createReporter();
			const output = createOutput();

			const sourcePath = path.join(root, 'kernel.config.ts');
			await fs.writeFile(sourcePath, 'export const kernelConfig = {};');

			const input = createBuilderInput({
				sourcePath,
				blocks: [
					{
						key: 'demo/missing',
						directory: 'src/blocks/missing',
						hasRender: true,
						manifestSource: path.join(
							'src',
							'blocks',
							'missing',
							'block.json'
						),
					},
				],
			});

			await builder.apply(
				{
					context: { workspace, reporter, phase: 'generate' },
					input,
					output,
					reporter,
				},
				undefined
			);

			expect(reporter.warn).toHaveBeenCalledWith(
				expect.stringContaining('Unable to read manifest')
			);
			expect(reporter.debug).toHaveBeenCalledWith(
				'createBlocksBuilder: no block artifacts generated.',
				{ warnings: 1 }
			);
			expect(output.actions).toHaveLength(0);
			await expect(
				workspace.exists(
					path.posix.join(
						'.generated',
						'build',
						'blocks-manifest.php'
					)
				)
			).resolves.toBe(false);
		});
	});
});
