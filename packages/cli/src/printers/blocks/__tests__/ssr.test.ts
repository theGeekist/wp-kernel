import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { generateSSRBlocks } from '../ssr.js';
import type { IRBlock } from '../../../ir/types.js';

async function withTempDir<T>(
	factory: (dir: string) => Promise<T>
): Promise<T> {
	const directory = await fs.mkdtemp(
		path.join(os.tmpdir(), 'wpk-ssr-blocks-')
	);
	try {
		return await factory(directory);
	} finally {
		await fs.rm(directory, { recursive: true, force: true });
	}
}

describe('generateSSRBlocks', () => {
	it('generates manifest and registrar for SSR blocks', async () => {
		await withTempDir(async (tempDir) => {
			const blockDir = path.join(tempDir, 'src', 'blocks', 'example');
			await fs.mkdir(blockDir, { recursive: true });

			const manifestPath = path.join(blockDir, 'block.json');
			await fs.writeFile(
				manifestPath,
				JSON.stringify({
					name: 'demo/example',
					title: 'Example',
					category: 'widgets',
					icon: 'database',
					editorScriptModule: 'file:./index.tsx',
					render: 'file:./render.php',
				}),
				'utf8'
			);

			const renderPath = path.join(blockDir, 'render.php');
			await fs.writeFile(renderPath, '<?php return "Rendered";');

			const blocks: IRBlock[] = [
				{
					key: 'demo/example',
					directory: 'src/blocks/example',
					hasRender: true,
					manifestSource: path.relative(tempDir, manifestPath),
				},
			];

			const result = await generateSSRBlocks({
				blocks,
				outputDir: path.join(tempDir, '.generated'),
				projectRoot: tempDir,
				source: 'kernel.config.ts',
				phpNamespace: 'Demo\\Plugin',
			});

			expect(result.warnings).toEqual([]);
			expect(result.files).toHaveLength(2);

			const files = new Map(
				result.files.map((file) => [file.path, file.content])
			);
			const manifestFile = path.join(
				tempDir,
				'.generated',
				'build',
				'blocks-manifest.php'
			);
			const registrarFile = path.join(
				tempDir,
				'.generated',
				'inc',
				'Blocks',
				'Register.php'
			);

			expect(files.has(manifestFile)).toBe(true);
			expect(files.has(registrarFile)).toBe(true);

			const manifestContent = files.get(manifestFile)!;
			expect(manifestContent).toContain("'demo/example'");
			expect(manifestContent).toContain(
				"'directory' => 'src/blocks/example'"
			);
			expect(manifestContent).toContain(
				"'render' => 'src/blocks/example/render.php'"
			);

			const registrarContent = files.get(registrarFile)!;
			expect(registrarContent).toContain('final class Register');
			expect(registrarContent).toContain(
				'public static function register(): void'
			);
			expect(registrarContent).toContain(
				'register_block_type_from_metadata'
			);
		});
	});

	it('warns when declared render file cannot be resolved', async () => {
		await withTempDir(async (tempDir) => {
			const blockDir = path.join(tempDir, 'src', 'blocks', 'missing');
			await fs.mkdir(blockDir, { recursive: true });

			const manifestPath = path.join(blockDir, 'block.json');
			await fs.writeFile(
				manifestPath,
				JSON.stringify({
					name: 'demo/missing',
					title: 'Missing',
					category: 'widgets',
					icon: 'database',
					editorScriptModule: 'file:./index.tsx',
					render: 'file:./does-not-exist.php',
				}),
				'utf8'
			);

			const blocks: IRBlock[] = [
				{
					key: 'demo/missing',
					directory: 'src/blocks/missing',
					hasRender: true,
					manifestSource: path.relative(tempDir, manifestPath),
				},
			];

			const result = await generateSSRBlocks({
				blocks,
				outputDir: path.join(tempDir, '.generated'),
				projectRoot: tempDir,
				phpNamespace: 'Demo\\Plugin',
			});

			expect(result.files).toHaveLength(3);
			expect(result.warnings).toHaveLength(1);
			expect(result.warnings[0]).toContain(
				'render file declared in manifest was missing'
			);

			const manifestFile = result.files.find((file) =>
				file.path.endsWith('blocks-manifest.php')
			);
			expect(manifestFile?.content).toContain("'render'");

			const stubFile = result.files.find((file) =>
				file.path.endsWith('does-not-exist.php')
			);
			expect(stubFile?.content).toContain('AUTO-GENERATED WPK STUB');
			expect(stubFile?.content).toContain('esc_html_e');
		});
	});

	it('returns empty result when no SSR blocks are provided', async () => {
		const result = await generateSSRBlocks({
			blocks: [],
			outputDir: '/tmp/out',
			projectRoot: '/tmp/project',
		});

		expect(result.files).toEqual([]);
		expect(result.warnings).toEqual([]);
	});
});
