/**
 * Build Verification: WordPress Externals
 *
 * Ensures that WordPress packages are NOT bundled in the output.
 * This is critical for WordPress compatibility - we must use window.wp.* globals.
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const distPath = resolve(__dirname, '../../../dist');

const requireDistFile = (relativePath: string) => {
	const fullPath = resolve(distPath, relativePath);
	if (!existsSync(fullPath)) {
		throw new Error(`Missing dist/${relativePath} - run pnpm build first`);
	}
	return fullPath;
};

describe('Build: WordPress externals', () => {
	let indexBundle: string;

	beforeAll(() => {
		const indexPath = requireDistFile('index.js');
		indexBundle = readFileSync(indexPath, 'utf-8');
	});

	it('produces a dist folder', () => {
		expect(existsSync(distPath)).toBe(true);
	});

	it.each([
		'@wordpress/api-fetch',
		'@wordpress/data',
		'@wordpress/element',
		'@wordpress/hooks',
	])('keeps %s as an external dependency', (packageName) => {
		expect(indexBundle).not.toContain(packageName);
	});

	it.each(['react-dom', 'createElement'])(
		'does not inline %s APIs',
		(symbol) => {
			expect(indexBundle).not.toContain(symbol);
		}
	);
});
