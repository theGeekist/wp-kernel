/**
 * Unit tests for @wpkernel/core package
 */

import { VERSION } from '../index';

const SEMVER_PATTERN =
	/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?(?:\+[a-zA-Z0-9.-]+)?$/;

describe('Kernel package entry points', () => {
	it('exposes a valid pre-release VERSION string', () => {
		expect(typeof VERSION).toBe('string');
		expect(VERSION).toMatch(SEMVER_PATTERN);
		expect(VERSION.startsWith('0.')).toBe(true);
	});

	it('re-exports VERSION from the package root', async () => {
		const kernelExports = await import('../index');
		expect(kernelExports.VERSION).toBe(VERSION);
	});
});
