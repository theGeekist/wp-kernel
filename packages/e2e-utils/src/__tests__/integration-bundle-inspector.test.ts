import path from 'node:path';
import { promises as fs } from 'node:fs';
import { inspectBundle } from '../integration/bundle-inspector.js';
import { createIsolatedWorkspace } from '../integration/workspace.js';

describe('inspectBundle', () => {
	it('summarises bundle entries and validates sourcemaps', async () => {
		const workspace = await createIsolatedWorkspace();
		const buildDir = path.join(workspace.root, 'build');
		await fs.mkdir(buildDir, { recursive: true });

		const bundlePath = path.join(buildDir, 'main.js');
		await fs.writeFile(
			bundlePath,
			["console.log('bundle');", '//# sourceMappingURL=main.js.map'].join(
				'\n'
			),
			'utf8'
		);
		const sourceMapPath = path.join(buildDir, 'main.js.map');
		await fs.writeFile(
			sourceMapPath,
			JSON.stringify({
				version: 3,
				sources: ['../src/index.ts'],
				mappings: '',
			}),
			'utf8'
		);

		const report = await inspectBundle({ buildDir, externals: ['react'] });
		expect(report.entries).toHaveLength(1);
		const [entry] = report.entries;
		expect(entry.hasSourceMap).toBe(true);
		expect(entry.externalViolations).toHaveLength(0);
		expect(entry.sourcemapViolations).toHaveLength(0);

		await workspace.dispose();
	});

	it('flags inline externals and missing sourcemaps', async () => {
		const workspace = await createIsolatedWorkspace();
		const buildDir = path.join(workspace.root, 'build');
		await fs.mkdir(buildDir, { recursive: true });

		const bundlePath = path.join(buildDir, 'inline.js');
		await fs.writeFile(
			bundlePath,
			"console.log('__REACT_DEVTOOLS_GLOBAL_HOOK__');",
			'utf8'
		);

		const report = await inspectBundle({ buildDir, externals: ['react'] });
		const [entry] = report.entries;
		expect(entry.hasSourceMap).toBe(false);
		expect(entry.externalViolations).toContain('react');
		expect(entry.sourcemapViolations).toContain('missing');

		await workspace.dispose();
	});

	it('detects WordPress inline code and sourcemap drift', async () => {
		const workspace = await createIsolatedWorkspace();
		const buildDir = path.join(workspace.root, 'build');
		await fs.mkdir(buildDir, { recursive: true });

		const bundlePath = path.join(buildDir, 'wp.js');
		await fs.writeFile(
			bundlePath,
			[
				"console.log('@wordpress/data/build-module');",
				'//# sourceMappingURL=wp.js.map',
			].join('\n'),
			'utf8'
		);
		await fs.writeFile(
			path.join(buildDir, 'wp.js.map'),
			JSON.stringify({
				version: 3,
				sources: ['../lib/index.ts'],
				mappings: '',
			}),
			'utf8'
		);

		const report = await inspectBundle({
			buildDir,
			externals: ['@wordpress/data'],
		});
		const [entry] = report.entries;
		expect(entry.externalViolations).toContain('@wordpress/data');
		expect(entry.sourcemapViolations).toContain('sources-outside-src');

		await workspace.dispose();
	});
});
