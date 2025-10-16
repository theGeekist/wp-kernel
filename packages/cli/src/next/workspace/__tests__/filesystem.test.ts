import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createWorkspace } from '../filesystem';

async function withWorkspace<T>(run: (root: string) => Promise<T>): Promise<T> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'workspace-test-'));
	try {
		return await run(root);
	} finally {
		await fs.rm(root, { recursive: true, force: true });
	}
}

describe('filesystem workspace', () => {
	it('reads and writes files relative to the workspace root', async () => {
		await withWorkspace(async (root) => {
			const workspace = createWorkspace(root);
			await workspace.write('nested/file.txt', 'hello world');
			const contents = await workspace.readText('nested/file.txt');
			expect(contents).toBe('hello world');
			expect(await workspace.exists('nested/file.txt')).toBe(true);
		});
	});

	it('rolls back transactional changes', async () => {
		await withWorkspace(async (root) => {
			const workspace = createWorkspace(root);
			workspace.begin('tx');
			await workspace.write('rollback.txt', 'temporary');
			const manifest = await workspace.rollback('tx');

			expect(manifest.writes).toContain('rollback.txt');
			expect(await workspace.exists('rollback.txt')).toBe(false);
		});
	});

	it('exposes dry-run manifests without persisting writes', async () => {
		await withWorkspace(async (root) => {
			const workspace = createWorkspace(root);
			const { manifest } = await workspace.dryRun(async () => {
				await workspace.write('one.txt', '1');
				await workspace.write('two.txt', '2');
			});

			expect(manifest.writes).toEqual(['one.txt', 'two.txt']);
			expect(await workspace.exists('one.txt')).toBe(false);
			expect(await workspace.exists('two.txt')).toBe(false);
		});
	});

	it('performs simple three-way merges and signals conflicts', async () => {
		await withWorkspace(async (root) => {
			const workspace = createWorkspace(root);
			await workspace.write('merge.txt', 'current');

			const clean = await workspace.threeWayMerge(
				'merge.txt',
				'base',
				'current',
				'incoming'
			);
			expect(clean).toBe('conflict');
			const merged = await workspace.readText('merge.txt');
			expect(merged).toContain('<<<<<<< CURRENT');
			expect(merged).toContain('>>>>>>> INCOMING');

			const cleanResult = await workspace.threeWayMerge(
				'merge.txt',
				'incoming',
				'incoming',
				'incoming'
			);
			expect(cleanResult).toBe('clean');
		});
	});

	it('commits transactional changes and exposes manifests', async () => {
		await withWorkspace(async (root) => {
			const workspace = createWorkspace(root);
			workspace.begin('commit-test');
			await workspace.writeJson(
				'data.json',
				{ ok: true },
				{ pretty: true }
			);
			const manifest = await workspace.commit('commit-test');

			expect(manifest.writes).toContain('data.json');
			const raw = await workspace.readText('data.json');
			expect(raw).toContain(`{
  "ok": true
}`);
		});
	});

	it('removes directories recursively and restores them on rollback', async () => {
		await withWorkspace(async (root) => {
			const workspace = createWorkspace(root);
			await workspace.write('nested/dir/file.txt', 'present');
			workspace.begin('remove');
			await workspace.rm('nested', { recursive: true });
			const manifest = await workspace.rollback('remove');

			expect(manifest.deletes).toContain('nested');
			const restored = await workspace.readText('nested/dir/file.txt');
			expect(restored).toBe('present');
		});
	});

	it('provides tmpDir helpers', async () => {
		await withWorkspace(async (root) => {
			const workspace = createWorkspace(root);
			const tmp = await workspace.tmpDir('next-workspace-');
			expect(tmp.startsWith(path.join(root, '.tmp'))).toBe(true);
		});
	});

	it('supports glob matching and resolution utilities', async () => {
		await withWorkspace(async (root) => {
			const workspace = createWorkspace(root);
			await workspace.write('glob/target.txt', 'ok');
			await workspace.write('glob/other.md', 'skip');

			const matches = await workspace.glob('glob/*.txt');
			expect(matches.some((entry) => entry.endsWith('target.txt'))).toBe(
				true
			);
			expect(workspace.resolve('glob')).toBe(path.join(root, 'glob'));
		});
	});

	it('writes buffers and respects ensureDir overrides', async () => {
		await withWorkspace(async (root) => {
			const workspace = createWorkspace(root);
			const buffer = Buffer.from([0xde, 0xad, 0xbe, 0xef]);
			await workspace.write('bin/file.dat', buffer);
			const disk = await workspace.read('bin/file.dat');
			expect(disk).toEqual(buffer);

			await expect(
				workspace.write('bin/nested/file.txt', 'data', {
					ensureDir: false,
				})
			).rejects.toHaveProperty('code', 'ENOENT');
		});
	});

	it('handles deletes for missing paths without throwing', async () => {
		await withWorkspace(async (root) => {
			const workspace = createWorkspace(root);
			await expect(
				workspace.rm('does-not-exist.txt')
			).resolves.toBeUndefined();
		});
	});

	it('rolls back dry-run scopes when the callback throws', async () => {
		await withWorkspace(async (root) => {
			const workspace = createWorkspace(root);
			await expect(
				workspace.dryRun(async () => {
					await workspace.write('transient.txt', 'temp');
					throw new Error('boom');
				})
			).rejects.toThrow('boom');

			expect(await workspace.exists('transient.txt')).toBe(false);
		});
	});

	it('guards against mismatched commit labels', async () => {
		await withWorkspace(async (root) => {
			const workspace = createWorkspace(root);
			workspace.begin('expected');
			await expect(workspace.commit('other')).rejects.toThrow(
				/Attempted to commit transaction/
			);
		});
	});
});
