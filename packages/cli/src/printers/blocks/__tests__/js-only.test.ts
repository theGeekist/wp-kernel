import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { generateJSOnlyBlocks } from '../js-only';
import type { IRBlock } from '../../../ir/types';

async function withTempDir<T>(
	factory: (directory: string) => Promise<T>
): Promise<T> {
	const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wpk-js-only-'));
	try {
		return await factory(tempDir);
	} finally {
		await fs.rm(tempDir, { recursive: true, force: true });
	}
}

describe('generateJSOnlyBlocks', () => {
	it('produces auto-register file and stubs for JS-only blocks', async () => {
		await withTempDir(async (tempDir) => {
			const blockDir = path.join(tempDir, 'blocks', 'example');
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
					viewScriptModule: 'file:./view.ts',
				}),
				'utf8'
			);

			const blocks: IRBlock[] = [
				{
					key: 'demo/example',
					directory: 'blocks/example',
					hasRender: false,
					manifestSource: path.relative(tempDir, manifestPath),
				},
			];

			const result = await generateJSOnlyBlocks({
				blocks,
				outputDir: path.join(tempDir, 'generated'),
				projectRoot: tempDir,
				source: 'kernel.config.ts',
			});

			expect(result.warnings).toEqual([]);
			expect(result.files).toHaveLength(3);

			const filesByPath = new Map(
				result.files.map((file) => [file.path, file.content])
			);

			const autoRegisterPath = path.join(
				tempDir,
				'generated',
				'auto-register.ts'
			);
			expect(filesByPath.has(autoRegisterPath)).toBe(true);
			const autoRegisterContent = filesByPath.get(autoRegisterPath)!;
			expect(autoRegisterContent).toContain(
				'export function registerGeneratedBlocks(): void {'
			);
			expect(autoRegisterContent).toContain(
				'No JS-only blocks require auto-registration.'
			);
			expect(autoRegisterContent).not.toContain(
				"registerBlockType('demo/example'"
			);

			const editorStubPath = path.join(blockDir, 'index.tsx');
			expect(filesByPath.has(editorStubPath)).toBe(true);
			expect(filesByPath.get(editorStubPath)).toContain(
				'AUTO-GENERATED WPK STUB'
			);

			const viewStubPath = path.join(blockDir, 'view.ts');
			expect(filesByPath.has(viewStubPath)).toBe(true);
			expect(filesByPath.get(viewStubPath)).toContain('initBlockView');
		});
	});

	it('auto-registers blocks without file-backed editor modules', async () => {
		await withTempDir(async (tempDir) => {
			const blockDir = path.join(tempDir, 'blocks', 'legacy');
			await fs.mkdir(blockDir, { recursive: true });
			const manifestPath = path.join(blockDir, 'block.json');
			await fs.writeFile(
				manifestPath,
				JSON.stringify({
					name: 'demo/legacy',
					title: 'Legacy',
					category: 'widgets',
					icon: 'admin-site',
					editorScript: 'legacy-editor-handle',
					viewScript: 'legacy-view-handle',
				}),
				'utf8'
			);

			const blocks: IRBlock[] = [
				{
					key: 'demo/legacy',
					directory: 'blocks/legacy',
					hasRender: false,
					manifestSource: path.relative(tempDir, manifestPath),
				},
			];

			const result = await generateJSOnlyBlocks({
				blocks,
				outputDir: path.join(tempDir, 'generated'),
				projectRoot: tempDir,
			});

			expect(result.warnings).toEqual([]);

			const filesByPath = new Map(
				result.files.map((file) => [file.path, file.content])
			);

			const autoRegisterPath = path.join(
				tempDir,
				'generated',
				'auto-register.ts'
			);
			expect(filesByPath.has(autoRegisterPath)).toBe(true);
			const autoRegisterContent = filesByPath.get(autoRegisterPath)!;
			expect(autoRegisterContent).toContain(
				"import { registerBlockType } from '@wordpress/blocks';"
			);
			expect(autoRegisterContent).toContain(
				"import demoLegacy from '../blocks/legacy/block.json'"
			);
			expect(autoRegisterContent).toContain(
				"registerBlockType('demo/legacy'"
			);
		});
	});

	it('returns warnings when manifest cannot be read', async () => {
		await withTempDir(async (tempDir) => {
			const blocks: IRBlock[] = [
				{
					key: 'demo/missing',
					directory: 'blocks/missing',
					hasRender: false,
					manifestSource: 'blocks/missing/block.json',
				},
			];

			const result = await generateJSOnlyBlocks({
				blocks,
				outputDir: path.join(tempDir, 'generated'),
				projectRoot: tempDir,
			});

			expect(result.files).toHaveLength(0);
			expect(result.warnings).toHaveLength(1);
			expect(result.warnings[0]).toContain('Unable to read manifest');
		});
	});

	it('skips generating stubs when files already exist or not requested', async () => {
		await withTempDir(async (tempDir) => {
			const blockDir = path.join(tempDir, 'blocks', 'custom');
			await fs.mkdir(blockDir, { recursive: true });

			const manifestPath = path.join(blockDir, 'block.json');
			await fs.writeFile(
				manifestPath,
				JSON.stringify({
					name: 'demo/custom',
					title: 'Custom',
					category: 'widgets',
					icon: 'database',
					editorScriptModule: 'file:./index.tsx',
					viewScriptModule: 'file:./view.ts',
				}),
				'utf8'
			);

			const existingEditorPath = path.join(blockDir, 'index.tsx');
			await fs.writeFile(existingEditorPath, '// existing', 'utf8');
			const existingViewPath = path.join(blockDir, 'view.ts');
			await fs.writeFile(existingViewPath, '// view existing', 'utf8');

			const blocks: IRBlock[] = [
				{
					key: 'demo/custom',
					directory: 'blocks/custom',
					hasRender: false,
					manifestSource: path.relative(tempDir, manifestPath),
				},
			];

			const result = await generateJSOnlyBlocks({
				blocks,
				outputDir: path.join(tempDir, 'generated'),
				projectRoot: tempDir,
			});

			expect(result.warnings).toEqual([]);
			const paths = result.files.map((file) => file.path);
			expect(paths).not.toContain(existingEditorPath);
			expect(paths).not.toContain(existingViewPath);
			expect(paths).toContain(
				path.join(tempDir, 'generated', 'auto-register.ts')
			);
		});
	});
});
