/**
 * Build Verification: Output Structure
 *
 * Ensures the build output has the expected structure and file organization.
 */

import { statSync, existsSync } from 'fs';
import { resolve } from 'path';

describe('Build: Output structure', () => {
	const distPath = resolve(__dirname, '../../../dist');

	it('should have dist folder', () => {
		expect(existsSync(distPath)).toBe(true);
		expect(statSync(distPath).isDirectory()).toBe(true);
	});

	describe('Entry points', () => {
		it('should have all entry point files', () => {
			const entryPoints = [
				'index.js',
				'http.js',
				'resource.js',
				'error.js',
			];

			entryPoints.forEach((entry) => {
				const filePath = resolve(distPath, entry);
				expect(existsSync(filePath)).toBe(true);
			});
		});

		it('should have sourcemaps for all entry points', () => {
			const sourcemaps = [
				'index.js.map',
				'http.js.map',
				'resource.js.map',
				'error.js.map',
			];

			sourcemaps.forEach((map) => {
				const filePath = resolve(distPath, map);
				expect(existsSync(filePath)).toBe(true);
			});
		});
	});

	describe('Preserved modules structure', () => {
		it('should have resource subdirectory', () => {
			const resourceDir = resolve(distPath, 'resource');
			expect(existsSync(resourceDir)).toBe(true);
			expect(statSync(resourceDir).isDirectory()).toBe(true);
		});

		it('should have error subdirectory', () => {
			const errorDir = resolve(distPath, 'error');
			expect(existsSync(errorDir)).toBe(true);
			expect(statSync(errorDir).isDirectory()).toBe(true);
		});

		it('should have http subdirectory', () => {
			const httpDir = resolve(distPath, 'http');
			expect(existsSync(httpDir)).toBe(true);
			expect(statSync(httpDir).isDirectory()).toBe(true);
		});

		it('should preserve internal module files', () => {
			const internalFiles = [
				'resource/define.js',
				'resource/store.js',
				'resource/cache.js',
				'error/KernelError.js',
				'http/fetch.js',
			];

			internalFiles.forEach((file) => {
				const filePath = resolve(distPath, file);
				expect(existsSync(filePath)).toBe(true);
			});
		});
	});

	describe('Package.json compliance', () => {
		it('should match exports paths from package.json', () => {
			// Check main export
			expect(existsSync(resolve(distPath, 'index.js'))).toBe(true);
			expect(existsSync(resolve(distPath, 'index.d.ts'))).toBe(true);

			// Check subpath exports (accounting for /index.js in exports map)
			expect(
				existsSync(resolve(distPath, 'http')) ||
					existsSync(resolve(distPath, 'http.js'))
			).toBe(true);
			expect(
				existsSync(resolve(distPath, 'resource')) ||
					existsSync(resolve(distPath, 'resource.js'))
			).toBe(true);
			expect(
				existsSync(resolve(distPath, 'error')) ||
					existsSync(resolve(distPath, 'error.js'))
			).toBe(true);
		});
	});
});
