import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
	collectFileManifest,
	diffFileManifests,
} from '../integration/fs-manifest.js';
import { createIsolatedWorkspace } from '../integration/workspace.js';

describe('collectFileManifest', () => {
	it('computes hashes and detects differences', async () => {
		const workspace = await createIsolatedWorkspace();
		const filePath = path.join(workspace.root, 'file.txt');
		await fs.writeFile(filePath, 'initial', 'utf8');

		const manifestA = await collectFileManifest(workspace.root);

		await fs.writeFile(filePath, 'updated', 'utf8');
		const addedPath = path.join(workspace.root, 'nested', 'new.txt');
		await fs.mkdir(path.dirname(addedPath), { recursive: true });
		await fs.writeFile(addedPath, 'nested', 'utf8');

		const manifestB = await collectFileManifest(workspace.root);
		const diff = diffFileManifests(manifestA, manifestB);

		expect(diff.added).toContain('nested/new.txt');
		expect(diff.changed).toContain('file.txt');
		expect(diff.removed).toHaveLength(0);

		await workspace.dispose();
	});

	it('supports string and regex ignore patterns', async () => {
		const workspace = await createIsolatedWorkspace();
		const includePath = path.join(workspace.root, 'include.txt');
		const ignoreDirFile = path.join(workspace.root, 'logs', 'ignored.log');
		const ignoreMatchFile = path.join(workspace.root, 'temporary.tmp');
		await fs.writeFile(includePath, 'include', 'utf8');
		await fs.mkdir(path.dirname(ignoreDirFile), { recursive: true });
		await fs.writeFile(ignoreDirFile, 'ignored', 'utf8');
		await fs.writeFile(ignoreMatchFile, 'ignored', 'utf8');

		const manifest = await collectFileManifest(workspace.root, {
			ignore: ['logs', /\.tmp$/],
		});

		expect(Object.keys(manifest.files)).toEqual(['include.txt']);

		await workspace.dispose();
	});

	it('detects removed files', async () => {
		const workspace = await createIsolatedWorkspace();
		const removedPath = path.join(workspace.root, 'remove.txt');
		await fs.writeFile(removedPath, 'remove', 'utf8');

		const manifestA = await collectFileManifest(workspace.root);
		await fs.rm(removedPath);
		const manifestB = await collectFileManifest(workspace.root);
		const diff = diffFileManifests(manifestA, manifestB);

		expect(diff.removed).toContain('remove.txt');

		await workspace.dispose();
	});
});
