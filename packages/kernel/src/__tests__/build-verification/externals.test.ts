/**
 * Build Verification: WordPress Externals
 *
 * Ensures that WordPress packages are NOT bundled in the output.
 * This is critical for WordPress compatibility - we must use window.wp.* globals.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

describe('Build: WordPress externals', () => {
	const distPath = resolve(__dirname, '../../../dist');

	it('should have built the dist folder', () => {
		expect(existsSync(distPath)).toBe(true);
	});

	it('should not bundle @wordpress/* packages in index.js', () => {
		const indexPath = resolve(distPath, 'index.js');
		if (!existsSync(indexPath)) {
			throw new Error('dist/index.js not found - run pnpm build first');
		}

		const indexBundle = readFileSync(indexPath, 'utf-8');

		// These package contents should NOT appear in our bundle
		// (we reference them as externals instead)
		expect(indexBundle).not.toContain('@wordpress/api-fetch');
		expect(indexBundle).not.toContain('@wordpress/data');
		expect(indexBundle).not.toContain('@wordpress/element');
		expect(indexBundle).not.toContain('@wordpress/hooks');
	});

	it('should not bundle React in index.js', () => {
		const indexPath = resolve(distPath, 'index.js');
		const indexBundle = readFileSync(indexPath, 'utf-8');

		// React should also be external
		expect(indexBundle).not.toContain('react-dom');
		expect(indexBundle).not.toContain('createElement');
	});
});
