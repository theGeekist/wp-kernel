import { inspectBundle } from '../integration/bundle-inspector.js';
import path from 'node:path';
import {
	withIsolatedWorkspace,
	writeWorkspaceFiles,
} from '../test-support/isolated-workspace.test-support.js';

describe('inspectBundle', () => {
	it('summarises bundle entries and validates sourcemaps', async () => {
		await withIsolatedWorkspace(async (workspace) => {
			const buildDir = path.join(workspace.root, 'build');
			await writeWorkspaceFiles(workspace, {
				'build/main.js': [
					"console.log('bundle');",
					'//# sourceMappingURL=main.js.map',
				].join('\n'),
				'build/main.js.map': JSON.stringify({
					version: 3,
					sources: ['../src/index.ts'],
					mappings: '',
				}),
			});

			const report = await inspectBundle({
				buildDir,
				externals: ['react'],
			});
			expect(report.entries).toHaveLength(1);
			const [entry] = report.entries;
			expect(entry.hasSourceMap).toBe(true);
			expect(entry.externalViolations).toHaveLength(0);
			expect(entry.sourcemapViolations).toHaveLength(0);
		});
	});

	it('flags inline externals and missing sourcemaps', async () => {
		await withIsolatedWorkspace(async (workspace) => {
			const buildDir = path.join(workspace.root, 'build');
			await writeWorkspaceFiles(workspace, {
				'build/inline.js':
					"console.log('__REACT_DEVTOOLS_GLOBAL_HOOK__');",
			});

			const report = await inspectBundle({
				buildDir,
				externals: ['react'],
			});
			const [entry] = report.entries;
			expect(entry.hasSourceMap).toBe(false);
			expect(entry.externalViolations).toContain('react');
			expect(entry.sourcemapViolations).toContain('missing');
		});
	});

	it('detects WordPress inline code and sourcemap drift', async () => {
		await withIsolatedWorkspace(async (workspace) => {
			const buildDir = path.join(workspace.root, 'build');
			await writeWorkspaceFiles(workspace, {
				'build/wp.js': [
					"console.log('@wordpress/data/build-module');",
					'//# sourceMappingURL=wp.js.map',
				].join('\n'),
				'build/wp.js.map': JSON.stringify({
					version: 3,
					sources: ['../lib/index.ts'],
					mappings: '',
				}),
			});

			const report = await inspectBundle({
				buildDir,
				externals: ['@wordpress/data'],
			});
			const [entry] = report.entries;
			expect(entry.externalViolations).toContain('@wordpress/data');
			expect(entry.sourcemapViolations).toContain('sources-outside-src');
		});
	});
});
