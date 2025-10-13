import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import { KernelError } from '@geekist/wp-kernel/error';
import {
	discoverBlocks,
	isOutsideWorkspace,
	shouldSkipEntry,
	loadBlockEntry,
	fileExists,
} from '../block-discovery';

describe('block discovery helpers', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('skips directories outside the workspace during traversal', async () => {
		const workspaceRoot = await fs.mkdtemp(
			path.join(os.tmpdir(), 'wpk-blocks-')
		);
		try {
			const readdir = jest
				.spyOn(fs, 'readdir')
				.mockImplementation(async (dir: string, _options?: unknown) => {
					if (dir === workspaceRoot) {
						return [
							createDirent({
								name: '..',
								type: 'dir',
							}),
						] as unknown as Dirent[];
					}

					if (dir === path.join(workspaceRoot, '..')) {
						return [] as unknown as Dirent[];
					}

					return [] as unknown as Dirent[];
				});

			const blocks = await discoverBlocks(workspaceRoot);

			expect(blocks).toEqual([]);
			expect(readdir).toHaveBeenCalledTimes(1);
		} finally {
			await fs.rm(workspaceRoot, { recursive: true, force: true });
		}
	});

	it('identifies entries that should be skipped', () => {
		const symlink = createDirent({ name: 'link', type: 'symlink' });
		const file = createDirent({ name: 'file', type: 'file' });
		const ignored = createDirent({ name: 'node_modules', type: 'dir' });
		const directory = createDirent({ name: 'blocks', type: 'dir' });

		expect(shouldSkipEntry(symlink as unknown as Dirent)).toBe(true);
		expect(shouldSkipEntry(file as unknown as Dirent)).toBe(true);
		expect(shouldSkipEntry(ignored as unknown as Dirent)).toBe(true);
		expect(shouldSkipEntry(directory as unknown as Dirent)).toBe(false);
	});

	it('loads block entries and detects render files', async () => {
		const tmp = await fs.mkdtemp(
			path.join(os.tmpdir(), 'wpk-block-entry-')
		);
		try {
			const blockDir = path.join(tmp, 'blocks', 'example');
			await fs.mkdir(blockDir, { recursive: true });
			const manifestPath = path.join(blockDir, 'block.json');
			await fs.writeFile(
				manifestPath,
				JSON.stringify({
					name: 'plugin/example',
					title: 'Example',
				}),
				'utf8'
			);
			await fs.writeFile(
				path.join(blockDir, 'render.php'),
				'<?php echo 1;'
			);

			const block = await loadBlockEntry(manifestPath, blockDir, tmp);

			expect(block).toMatchObject({
				key: 'plugin/example',
				hasRender: true,
			});
		} finally {
			await fs.rm(tmp, { recursive: true, force: true });
		}
	});

	it('rethrows unexpected fs errors when checking file existence', async () => {
		const error = Object.assign(new Error('boom'), { code: 'EACCES' });
		const statSpy = jest
			.spyOn(fs, 'stat')
			.mockRejectedValue(error as NodeJS.ErrnoException);

		await expect(fileExists('/tmp/forbidden')).rejects.toThrow(error);
		expect(statSpy).toHaveBeenCalled();
	});

	it('throws kernel errors when manifests cannot be read or are invalid', async () => {
		const tmp = await fs.mkdtemp(
			path.join(os.tmpdir(), 'wpk-block-error-')
		);
		try {
			const blockDir = path.join(tmp, 'broken');
			await fs.mkdir(blockDir, { recursive: true });
			const manifestPath = path.join(blockDir, 'block.json');
			await fs.writeFile(manifestPath, 'not json', 'utf8');

			await expect(
				loadBlockEntry(manifestPath, blockDir, tmp)
			).rejects.toBeInstanceOf(KernelError);

			await fs.writeFile(
				manifestPath,
				JSON.stringify('not-an-object'),
				'utf8'
			);

			await expect(
				loadBlockEntry(manifestPath, blockDir, tmp)
			).rejects.toBeInstanceOf(KernelError);
		} finally {
			await fs.rm(tmp, { recursive: true, force: true });
		}
	});

	it('detects paths outside the workspace root', () => {
		const workspaceRoot = '/workspace/project';
		const outside = path.join(workspaceRoot, '..', 'other');

		expect(isOutsideWorkspace(workspaceRoot, outside)).toBe(true);
		expect(
			isOutsideWorkspace(workspaceRoot, path.join(workspaceRoot, 'src'))
		).toBe(false);
	});
});

function createDirent(options: {
	name: string;
	type: 'file' | 'dir' | 'symlink';
}) {
	return {
		name: options.name,
		isFile: () => options.type === 'file',
		isDirectory: () => options.type === 'dir',
		isSymbolicLink: () => options.type === 'symlink',
	};
}
