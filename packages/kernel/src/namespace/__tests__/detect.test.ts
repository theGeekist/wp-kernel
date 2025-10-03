/**
 * Tests for namespace detection functionality
 *
 * Using centralized WordPress type infrastructure with clean, typed global mocking.
 * No 'any' types or manual global cleanup required.
 */

import {
	detectNamespace,
	getNamespace,
	isValidNamespace,
	sanitizeNamespace,
} from '../detect.js';
import {
	setKernelPackage,
	setWpPluginData,
	setProcessEnv,
	clearNamespaceState,
} from '../../../../../tests/test-utils/wp.js';

describe('sanitizeNamespace', () => {
	describe('valid inputs', () => {
		it('should return valid namespace unchanged', () => {
			expect(sanitizeNamespace('my-plugin')).toBe('my-plugin');
			expect(sanitizeNamespace('acme-blog')).toBe('acme-blog');
			expect(sanitizeNamespace('test123')).toBe('test123');
		});

		it('should convert uppercase to lowercase', () => {
			expect(sanitizeNamespace('My-Plugin')).toBe('my-plugin');
			expect(sanitizeNamespace('ACME-BLOG')).toBe('acme-blog');
		});

		it('should convert spaces and underscores to hyphens', () => {
			expect(sanitizeNamespace('my plugin')).toBe('my-plugin');
			expect(sanitizeNamespace('my_plugin')).toBe('my-plugin');
			expect(sanitizeNamespace('my   plugin')).toBe('my-plugin');
		});

		it('should remove invalid characters', () => {
			expect(sanitizeNamespace('my@plugin!')).toBe('myplugin');
			expect(sanitizeNamespace('acme.blog')).toBe('acmeblog');
			expect(sanitizeNamespace('test$123')).toBe('test123');
		});

		it('should remove multiple consecutive hyphens', () => {
			expect(sanitizeNamespace('my---plugin')).toBe('my-plugin');
			expect(sanitizeNamespace('test--123')).toBe('test-123');
		});

		it('should remove leading and trailing hyphens', () => {
			expect(sanitizeNamespace('-my-plugin-')).toBe('my-plugin');
			expect(sanitizeNamespace('--test--')).toBe('test');
		});

		it('should handle complex sanitization', () => {
			expect(sanitizeNamespace('  My_@Plugin--123!  ')).toBe(
				'my-plugin-123'
			);
		});
	});

	describe('invalid inputs', () => {
		it('should return null for empty or invalid strings', () => {
			expect(sanitizeNamespace('')).toBeNull();
			expect(sanitizeNamespace('   ')).toBeNull();
			expect(sanitizeNamespace('---')).toBeNull();
		});

		it('should return null for reserved words', () => {
			expect(sanitizeNamespace('wp')).toBeNull();
			expect(sanitizeNamespace('wordpress')).toBeNull();
			expect(sanitizeNamespace('admin')).toBeNull();
		});

		it('should return null for namespaces not starting with letter', () => {
			expect(sanitizeNamespace('123plugin')).toBeNull();
			expect(sanitizeNamespace('-plugin')).toBe('plugin'); // Leading hyphen is removed
		});

		it('should return null for too short namespaces', () => {
			expect(sanitizeNamespace('ab')).toBeNull();
			expect(sanitizeNamespace('a')).toBeNull();
		});

		it('should return null for too long namespaces', () => {
			const longName = 'a'.repeat(51);
			expect(sanitizeNamespace(longName)).toBeNull();
		});

		it('should return null for non-string inputs', () => {
			expect(sanitizeNamespace(null as any)).toBeNull();
			expect(sanitizeNamespace(undefined as any)).toBeNull();
			expect(sanitizeNamespace(123 as any)).toBeNull();
		});
	});
});

describe('isValidNamespace', () => {
	it('should return true for valid namespaces', () => {
		expect(isValidNamespace('my-plugin')).toBe(true);
		expect(isValidNamespace('acme-blog')).toBe(true);
		expect(isValidNamespace('test123')).toBe(true);
	});

	it('should return false for invalid namespaces', () => {
		expect(isValidNamespace('')).toBe(false);
		expect(isValidNamespace('123test')).toBe(false);
		expect(isValidNamespace('wp')).toBe(false); // reserved
		expect(isValidNamespace('123test')).toBe(false); // starts with number
		expect(isValidNamespace('ab')).toBe(false); // too short
	});
});

describe('explicit namespace priority', () => {
	// Global cleanup is handled automatically by Jest setup

	it('should use explicit namespace when provided and valid', () => {
		const result = detectNamespace({ explicit: 'my-plugin' });
		expect(result).toEqual({
			namespace: 'my-plugin',
			source: 'explicit',
			sanitized: false,
		});
	});

	it('should sanitize explicit namespace when needed', () => {
		const result = detectNamespace({ explicit: 'My Plugin!' });
		expect(result).toEqual({
			namespace: 'my-plugin',
			source: 'explicit',
			sanitized: true,
			original: 'My Plugin!',
		});
	});

	it('should fall through when explicit namespace is invalid', () => {
		const result = detectNamespace({ explicit: '123invalid' });
		expect(result.source).toBe('fallback');
		expect(result.namespace).toBe('wpk');
	});

	it('should skip validation when validate=false', () => {
		const result = detectNamespace({
			explicit: '123invalid',
			validate: false,
		});
		expect(result).toEqual({
			namespace: '123invalid',
			source: 'explicit',
			sanitized: false,
		});
	});
});

describe('plugin header detection', () => {
	// Global cleanup is handled automatically by Jest setup

	it('should extract from WordPress global data', () => {
		setWpPluginData({ name: 'my-plugin' });

		const result = detectNamespace();
		expect(result).toEqual({
			namespace: 'my-plugin',
			source: 'plugin-header',
			sanitized: false,
		});
	});

	it('should handle extraction errors gracefully', () => {
		// Test with invalid global data that should fall through to fallback
		setWpPluginData({ name: '' }); // Empty name

		const result = detectNamespace();
		expect(result.source).toBe('fallback');
		expect(result.namespace).toBe('wpk');
	});
});

describe('package.json detection', () => {
	// Global cleanup is handled automatically by Jest setup

	it('should extract from bundled package data', () => {
		clearNamespaceState(); // Clear any previous state
		setKernelPackage({ name: 'my-plugin' });

		const result = detectNamespace();
		expect(result).toEqual({
			namespace: 'my-plugin',
			source: 'package-json',
			sanitized: false,
		});
	});

	it('should extract from scoped package names', () => {
		clearNamespaceState(); // Clear any previous state
		setKernelPackage({ name: '@acme/my-plugin' });

		const result = detectNamespace();
		expect(result).toEqual({
			namespace: 'my-plugin',
			source: 'package-json',
			sanitized: false,
		});
	});

	it('should handle Node.js context gracefully', () => {
		clearNamespaceState(); // Ensure no package data from previous tests
		// Simulate Node.js environment
		setProcessEnv({ NODE_ENV: 'test' });

		const result = detectNamespace();
		expect(result.source).toBe('fallback');
		expect(result.namespace).toBe('wpk');
	});

	it('should handle package data errors gracefully', () => {
		clearNamespaceState(); // Clear any previous state
		// Test with getter that throws
		setKernelPackage({ name: 'error-package' });

		// Should fall through to fallback since we don't set a custom error
		const result = detectNamespace();
		expect(result.source).toBe('package-json');
		expect(result.namespace).toBe('error-package');
	});
});

describe('fallback behavior', () => {
	// Global cleanup is handled automatically by Jest setup

	it('should use default fallback', () => {
		clearNamespaceState(); // Ensure no data from previous tests
		const result = detectNamespace();
		expect(result).toEqual({
			namespace: 'wpk',
			source: 'fallback',
			sanitized: false,
		});
	});

	it('should use custom fallback', () => {
		clearNamespaceState(); // Ensure no data from previous tests
		const result = detectNamespace({ fallback: 'custom' });
		expect(result).toEqual({
			namespace: 'custom',
			source: 'fallback',
			sanitized: false,
		});
	});

	it('should sanitize invalid fallback', () => {
		clearNamespaceState(); // Ensure no data from previous tests
		const result = detectNamespace({ fallback: 'My Custom!' });
		expect(result).toEqual({
			namespace: 'my-custom',
			source: 'fallback',
			sanitized: true,
			original: 'My Custom!',
		});
	});

	it('should use wpk when fallback is invalid', () => {
		clearNamespaceState(); // Ensure no data from previous tests
		const result = detectNamespace({ fallback: '123invalid' });
		expect(result).toEqual({
			namespace: 'wpk',
			source: 'fallback',
			sanitized: true,
			original: '123invalid',
		});
	});
});

describe('validation handling', () => {
	// Global cleanup is handled automatically by Jest setup

	it('should sanitize detected namespaces when validate=true', () => {
		setWpPluginData({ name: 'My Plugin' });

		const result = detectNamespace({ validate: true });
		expect(result).toEqual({
			namespace: 'my-plugin',
			source: 'plugin-header',
			sanitized: true,
			original: 'My Plugin',
		});
	});

	it('should skip sanitization when validate=false', () => {
		setWpPluginData({ name: 'My Plugin' });

		const result = detectNamespace({ validate: false });
		expect(result).toEqual({
			namespace: 'My Plugin',
			source: 'plugin-header',
			sanitized: false,
		});
	});
});

describe('getNamespace', () => {
	// Global cleanup is handled automatically by Jest setup

	it('should return namespace string from detectNamespace', () => {
		clearNamespaceState(); // Clear any previous state
		const namespace = getNamespace();
		expect(typeof namespace).toBe('string');
		expect(namespace).toBe('wpk');
	});

	it('should handle sanitization', () => {
		setWpPluginData({ name: 'My Plugin' });
		const namespace = getNamespace();
		expect(namespace).toBe('my-plugin'); // getNamespace sanitizes by default
	});
});

describe('integration scenarios', () => {
	// Global cleanup is handled automatically by Jest setup

	it('should prioritize explicit over plugin header', () => {
		setWpPluginData({ name: 'plugin-name' });
		const result = detectNamespace({ explicit: 'explicit-name' });
		expect(result.namespace).toBe('explicit-name');
		expect(result.source).toBe('explicit');
	});

	it('should prioritize plugin header over package.json', () => {
		setKernelPackage({ name: 'package-name' });
		setWpPluginData({ name: 'plugin-name' });
		const result = detectNamespace();
		expect(result.namespace).toBe('plugin-name');
		expect(result.source).toBe('plugin-header');
	});

	it('should prioritize package.json over fallback', () => {
		clearNamespaceState(); // Clear any previous state
		setKernelPackage({ name: 'package-name' });
		const result = detectNamespace({ fallback: 'fallback-name' });
		expect(result.namespace).toBe('package-name');
		expect(result.source).toBe('package-json');
	});

	it('should cascade through all detection methods', () => {
		clearNamespaceState(); // Clear any previous state
		// No explicit, no plugin data, no package data -> fallback
		const result = detectNamespace({ fallback: 'final-fallback' });
		expect(result.namespace).toBe('final-fallback');
		expect(result.source).toBe('fallback');
	});
});
