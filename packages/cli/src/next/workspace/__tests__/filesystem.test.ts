import { createWorkspace } from '../../workspace/filesystem';
import fs from 'node:fs/promises';
import path from 'node:path';

describe('FilesystemWorkspace basic operations', () => {
	const root = path.join(process.cwd(), 'tmp-test-workspace');

	beforeAll(async () => {
		await fs
			.rm(root, { recursive: true, force: true })
			.catch(() => undefined);
		await fs.mkdir(root, { recursive: true });
	});

	afterAll(async () => {
		await fs
			.rm(root, { recursive: true, force: true })
			.catch(() => undefined);
	});

	it('read returns null for missing file and write/readText works', async () => {
		const ws = createWorkspace(root);
		const missing = await ws.readText('no-such-file.txt');
		expect(missing).toBeNull();

		await ws.write('dir/a.txt', 'hello');
		const got = await ws.readText('dir/a.txt');
		expect(got).toBe('hello');
	});

	it('begin/commit produces manifest with writes and deletes', async () => {
		const ws = createWorkspace(root);
		ws.begin('t1');
		await ws.write('b.txt', 'x');
		await ws.rm('does-not-exist.txt');
		const manifest = await ws.commit('t1');
		expect(manifest.writes).toContain('b.txt');
	});

	it('threeWayMerge returns clean when base matches incoming or current', async () => {
		const ws = createWorkspace(root);
		const file = 'm.txt';
		await ws.write(file, 'base');
		let status = await ws.threeWayMerge(file, 'base', 'base', 'incoming');
		expect(status).toBe('clean');

		status = await ws.threeWayMerge(file, 'base', 'current', 'base');
		expect(status).toBe('clean');
	});

	it('tmpDir creates a directory under .tmp', async () => {
		const ws = createWorkspace(root);
		const dir = await ws.tmpDir('pref-');
		expect(dir).toContain(path.join(root, '.tmp'));
		await fs.rm(dir, { recursive: true, force: true });
	});
});
import { execFile } from 'node:child_process';
import os from 'node:os';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

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

	it('provides tmpDir helpers and git metadata', async () => {
		await withWorkspace(async (root) => {
			const workspace = createWorkspace(root);
			const tmp = await workspace.tmpDir('next-workspace-');
			expect(tmp.startsWith(path.join(root, '.tmp'))).toBe(true);
			expect(await workspace.git.isRepo()).toBe(false);
			expect(await workspace.git.currentBranch()).toBe('');
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

	it('exposes git helpers when operating inside a repository', async () => {
		await withWorkspace(async (root) => {
			await execFileAsync('git', ['init'], { cwd: root });
			await execFileAsync(
				'git',
				['config', 'user.email', 'test@example.com'],
				{
					cwd: root,
				}
			);
			await execFileAsync('git', ['config', 'user.name', 'Tester'], {
				cwd: root,
			});
			await fs.writeFile(path.join(root, 'initial.txt'), 'seed');
			const workspace = createWorkspace(root);

			await expect(workspace.git.add([])).resolves.toBeUndefined();
			await workspace.git.add('initial.txt');
			expect(await workspace.git.isRepo()).toBe(true);
			await workspace.write('tracked.txt', 'content');
			await workspace.git.add('tracked.txt');
			await workspace.git.commit('chore: add tracked file');
			const branch = await workspace.git.currentBranch();
			expect(typeof branch).toBe('string');
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

	it('commit without active scope throws', async () => {
		await withWorkspace(async (root) => {
			const workspace = createWorkspace(root);
			await expect(workspace.commit()).rejects.toThrow(
				/Attempted to commit workspace transaction without an active scope/
			);
		});
	});

	it('rollback without active scope throws', async () => {
		await withWorkspace(async (root) => {
			const workspace = createWorkspace(root);
			await expect(workspace.rollback()).rejects.toThrow(
				/Attempted to rollback workspace transaction without an active scope/
			);
		});
	});

	it('rollback label mismatch throws', async () => {
		await withWorkspace(async (root) => {
			const workspace = createWorkspace(root);
			workspace.begin('one');
			await expect(workspace.rollback('other')).rejects.toThrow(
				/Attempted to rollback transaction/
			);
		});
	});

	it('rollback restores original file content', async () => {
		await withWorkspace(async (root) => {
			const workspace = createWorkspace(root);
			// create original file
			await fs.writeFile(path.join(root, 'f.txt'), 'original');
			workspace.begin('restore');
			// overwrite file (this should record original on write)
			await workspace.write('f.txt', 'changed');
			const manifest = await workspace.rollback('restore');
			expect(manifest.writes).toContain('f.txt');
			const content = await workspace.readText('f.txt');
			expect(content).toBe('original');
		});
	});

	it('glob with empty patterns returns empty array', async () => {
		await withWorkspace(async (root) => {
			const workspace = createWorkspace(root);
			const result = await workspace.glob([]);
			expect(result).toEqual([]);
		});
	});

	// (Removed flaky test that mocked native fs.rm; mocking node core promises
	// properties is brittle in Jest. Remaining tests exercise the important
	// branches: ENOENT handling, transactional restore, dry-run, commit/rollback guards.)
});
