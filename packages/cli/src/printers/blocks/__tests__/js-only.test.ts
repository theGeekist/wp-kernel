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
	it('produces auto-register file for JS-only blocks', async () => {
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
			expect(result.files).toHaveLength(1);
			const file = result.files[0]!;
			expect(file.path).toBe(
				path.join(tempDir, 'generated', 'auto-register.ts')
			);
			expect(file.content).toContain(
				"import { registerBlockType } from '@wordpress/blocks';"
			);
			expect(file.content).toContain("registerBlockType('demo/example'");
			expect(file.content).toContain(
				"import demoExample from '../blocks/example/block.json'"
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
});
