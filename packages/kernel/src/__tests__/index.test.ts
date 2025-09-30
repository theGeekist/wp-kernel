/**
 * Unit tests for @geekist/wp-kernel package
 */

import { VERSION } from '../index';

describe('Kernel Package', () => {
	describe('VERSION', () => {
		it('should export a VERSION string', () => {
			expect(VERSION).toBeDefined();
			expect(typeof VERSION).toBe('string');
		});

		it('should have a valid semantic version format', () => {
			// Match semver format: MAJOR.MINOR.PATCH or MAJOR.MINOR.PATCH-prerelease
			const semverRegex =
				/^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
			expect(VERSION).toMatch(semverRegex);
		});

		it('should start with 0.x during pre-1.0 development', () => {
			expect(VERSION).toMatch(/^0\./);
		});
	});

	describe('package exports', () => {
		it('should export VERSION as a named export', async () => {
			const kernelExports = await import('../index');
			expect(kernelExports).toHaveProperty('VERSION');
		});
	});
});
