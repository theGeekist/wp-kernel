import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { emitBlockArtifacts } from '../index.js';
import type { PrinterContext } from '../../types.js';
import type { IRBlock, IRv1 } from '../../../ir/types.js';
import type { KernelConfigV1 } from '../../../config/types.js';

async function withTempDir<T>(
	factory: (dir: string) => Promise<T>
): Promise<T> {
	const directory = await fs.mkdtemp(
		path.join(os.tmpdir(), 'wpk-blocks-integration-')
	);
	try {
		return await factory(directory);
	} finally {
		await fs.rm(directory, { recursive: true, force: true });
	}
}

describe('emitBlockArtifacts – integration', () => {
	it('writes JS and SSR block outputs together', async () => {
		await withTempDir(async (tempDir) => {
			const blocksRoot = path.join(tempDir, 'src', 'blocks');
			const jsBlockDir = path.join(blocksRoot, 'js-only');
			const ssrBlockDir = path.join(blocksRoot, 'ssr-block');
			await fs.mkdir(jsBlockDir, { recursive: true });
			await fs.mkdir(ssrBlockDir, { recursive: true });

			await fs.writeFile(
				path.join(jsBlockDir, 'block.json'),
				JSON.stringify({
					name: 'demo/js-only',
					title: 'JS Only',
					category: 'widgets',
					icon: 'smiley',
					editorScriptModule: 'file:./index.tsx',
					viewScriptModule: 'file:./view.ts',
				}),
				'utf8'
			);

			await fs.writeFile(
				path.join(ssrBlockDir, 'block.json'),
				JSON.stringify({
					name: 'demo/ssr-block',
					title: 'SSR Block',
					category: 'widgets',
					icon: 'database',
					render: 'file:./render.php',
				}),
				'utf8'
			);
			await fs.writeFile(
				path.join(ssrBlockDir, 'render.php'),
				'<?php echo "SSR";'
			);

			const blocks: IRBlock[] = [
				{
					key: 'demo/js-only',
					directory: 'src/blocks/js-only',
					hasRender: false,
					manifestSource: 'src/blocks/js-only/block.json',
				},
				{
					key: 'demo/ssr-block',
					directory: 'src/blocks/ssr-block',
					hasRender: true,
					manifestSource: 'src/blocks/ssr-block/block.json',
				},
			];

			const ir: IRv1 = {
				meta: {
					version: 1,
					namespace: 'demo',
					sourcePath: 'kernel.config.ts',
					origin: 'kernel.config.ts',
					sanitizedNamespace: 'Demo\\Plugin',
				},
				config: { namespace: 'demo' } as KernelConfigV1,
				schemas: [],
				resources: [],
				policies: [],
				blocks,
				php: {
					namespace: 'Demo\\Plugin',
					autoload: 'inc/',
					outputDir: '.generated/php',
				},
			} as IRv1;

			const outputDir = path.join(tempDir, '.generated');

			const context: PrinterContext = {
				ir,
				outputDir,
				configDirectory: tempDir,
				formatTs: async (_filePath, contents) =>
					ensureTrailingNewline(contents),
				formatPhp: async (_filePath, contents) =>
					ensureTrailingNewline(contents),
				writeFile: async (filePath, contents) => {
					await fs.writeFile(
						filePath,
						ensureTrailingNewline(contents),
						'utf8'
					);
				},
				ensureDirectory: async (directoryPath) => {
					await fs.mkdir(directoryPath, { recursive: true });
				},
			} as PrinterContext;

			await emitBlockArtifacts(context);

			const autoRegisterPath = path.join(
				outputDir,
				'blocks',
				'auto-register.ts'
			);
			const jsStubPath = path.join(
				tempDir,
				'src',
				'blocks',
				'js-only',
				'index.tsx'
			);
			const ssrManifestPath = path.join(
				outputDir,
				'build',
				'blocks-manifest.php'
			);
			const registrarPath = path.join(
				outputDir,
				'inc',
				'Blocks',
				'Register.php'
			);

			const autoRegister = await fs.readFile(autoRegisterPath, 'utf8');
			expect(autoRegister).toContain(
				'No JS-only blocks require auto-registration.'
			);

			const jsStub = await fs.readFile(jsStubPath, 'utf8');
			expect(jsStub).toContain('AUTO-GENERATED WPK STUB');

			const manifest = await fs.readFile(ssrManifestPath, 'utf8');
			expect(manifest).toContain("'demo/ssr-block'");
			expect(manifest).toContain(
				"'render' => 'src/blocks/ssr-block/render.php'"
			);

			const registrar = await fs.readFile(registrarPath, 'utf8');
			expect(registrar).toContain('final class Register');
			expect(registrar).toContain('register_block_type_from_metadata');
		});
	});
});

function ensureTrailingNewline(value: string): string {
	return value.endsWith('\n') ? value : `${value}\n`;
}
