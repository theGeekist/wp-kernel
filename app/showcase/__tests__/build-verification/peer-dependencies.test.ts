/**
 * Build Verification: Peer Dependencies
 *
 * Ensures that required peer dependencies for @kucrut/vite-for-wp are installed.
 * Without these, WordPress packages will be bundled instead of externalized.
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

describe('Build: Peer Dependencies for @kucrut/vite-for-wp', () => {
	const nodeModulesPath = resolve(__dirname, '../../node_modules');
	const packageJsonPath = resolve(__dirname, '../../package.json');
	let packageJson: { devDependencies?: Record<string, string> };

	beforeAll(() => {
		const content = readFileSync(packageJsonPath, 'utf-8');
		packageJson = JSON.parse(content);
	});

	it('should have rollup-plugin-external-globals installed', () => {
		const pluginPath = resolve(
			nodeModulesPath,
			'rollup-plugin-external-globals'
		);
		expect(existsSync(pluginPath)).toBe(true);
	});

	it('should have vite-plugin-external installed', () => {
		const pluginPath = resolve(nodeModulesPath, 'vite-plugin-external');
		expect(existsSync(pluginPath)).toBe(true);
	});

	it('should be declared in package.json', () => {
		const devDeps = packageJson.devDependencies || {};

		expect(devDeps['rollup-plugin-external-globals']).toBeDefined();
		expect(devDeps['vite-plugin-external']).toBeDefined();
	});

	it('should verify peer dependencies are compatible versions', () => {
		const devDeps = packageJson.devDependencies || {};

		// rollup-plugin-external-globals should be ^0.13.x
		expect(devDeps['rollup-plugin-external-globals']).toMatch(/\^0\.13\./);

		// vite-plugin-external should be ^6.x
		expect(devDeps['vite-plugin-external']).toMatch(/\^6\./);
	});
});
