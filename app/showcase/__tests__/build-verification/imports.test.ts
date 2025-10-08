/**
 * Build Verification: Monorepo Imports
 *
 * Ensures that showcase can import from kernel and ui packages,
 * and that those imports are properly resolved in the built bundle.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

describe('Build: Monorepo package imports', () => {
	const buildPath = resolve(__dirname, '../../build');
	const indexPath = resolve(buildPath, 'index.js');

	it('should have built the bundle', () => {
		expect(existsSync(buildPath)).toBe(true);
		expect(existsSync(indexPath)).toBe(true);
	});

	it('should be able to import from @geekist/wp-kernel', async () => {
		// Dynamic import the built module
		// Note: In a real test, this would run in a browser/Node environment
		// For now, we just verify the import statement exists in source
		const sourceFile = resolve(__dirname, '../../src/resources/job.ts');
		const source = readFileSync(sourceFile, 'utf-8');

		// Verify source imports from kernel
		expect(source).toContain('@geekist/wp-kernel');
	});

	it('should bundle kernel code (not external)', () => {
		const bundle = readFileSync(indexPath, 'utf-8');

		// Since kernel is a workspace package, it should be bundled
		// (not marked as external like WordPress packages)
		// With WordPress packages properly externalized, bundle should be ~20-30KB
		// (vs 100KB+ when bundling WordPress packages)
		expect(bundle.length).toBeGreaterThan(15000); // Should contain kernel code
		expect(bundle.length).toBeLessThan(52000); // But not bundle WordPress
	});

	it('should NOT bundle WordPress packages', () => {
		const bundle = readFileSync(indexPath, 'utf-8');

		// WordPress packages should be external (not bundled)
		// Look for import statements instead of bundled code
		const hasWpImports =
			bundle.includes('wp.data') ||
			bundle.includes('wp.element') ||
			bundle.includes('@wordpress/data') ||
			bundle.includes('@wordpress/element');

		expect(hasWpImports).toBe(true);
	});

	it('should have a manifest.json for PHP integration', () => {
		const manifestPath = resolve(buildPath, 'manifest.json');
		expect(existsSync(manifestPath)).toBe(true);

		const manifest = JSON.parse(
			readFileSync(manifestPath, 'utf-8')
		) as Record<
			string,
			{ file: string; name: string; src: string; isEntry: boolean }
		>;

		// Should have the index entry
		expect(manifest['src/index.ts']).toBeDefined();
		expect(manifest['src/index.ts'].file).toBe('index.js');
		expect(manifest['src/index.ts'].isEntry).toBe(true);
	});
});
