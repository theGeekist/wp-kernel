import { withIsolatedWorkspace } from '../test-support/isolated-workspace.test-support.js';
import {
	collectManifestState,
	compareManifestStates,
} from '../test-support/fs-manifest.test-support.js';

describe('collectFileManifest', () => {
	it('computes hashes and detects differences', async () => {
		await withIsolatedWorkspace(async (workspace) => {
			const { diff } = await compareManifestStates(workspace, {
				before: {
					'file.txt': 'initial',
				},
				after: {
					'file.txt': 'updated',
					'nested/new.txt': 'nested',
				},
			});

			expect(diff.added).toContain('nested/new.txt');
			expect(diff.changed).toContain('file.txt');
			expect(diff.removed).toHaveLength(0);
		});
	});

	it('supports string and regex ignore patterns', async () => {
		await withIsolatedWorkspace(async (workspace) => {
			const manifest = await collectManifestState(workspace, {
				files: {
					'include.txt': 'include',
					'logs/ignored.log': 'ignored',
					'temporary.tmp': 'ignored',
				},
				ignore: ['logs', /\.tmp$/],
			});

			expect(Object.keys(manifest.files)).toEqual(['include.txt']);
		});
	});

	it('detects removed files', async () => {
		await withIsolatedWorkspace(async (workspace) => {
			const { diff } = await compareManifestStates(workspace, {
				before: {
					'remove.txt': 'remove',
				},
				after: {
					'remove.txt': { delete: true },
				},
			});

			expect(diff.removed).toContain('remove.txt');
		});
	});
});
