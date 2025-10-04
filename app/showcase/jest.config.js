/**
 * Jest configuration for Showcase app
 * Extends root config but ensures E2E tests are excluded
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const rootConfig = require('../../jest.config.cjs');

export default {
	...rootConfig,

	// Override roots to only include this app
	roots: ['<rootDir>'],

	// Setup files (adjust path for showcase context)
	setupFilesAfterEnv: ['<rootDir>/../../tests/setup-jest.ts'],

	// Explicitly exclude E2E tests - Jest should only run unit tests
	testMatch: [
		'**/__tests__/**/*.test.ts',
		'**/__tests__/**/*.test.tsx',
		// Explicitly exclude spec files (these are E2E tests for Playwright)
		'!**/__tests__/**/*.spec.ts',
		'!**/__tests__/**/*.spec.tsx',
	],

	// Additional ignore patterns specific to showcase
	testPathIgnorePatterns: [
		...rootConfig.testPathIgnorePatterns,
		'<rootDir>/__tests__/e2e/', // Exclude entire E2E directory
		'<rootDir>/e2e/', // Exclude any top-level E2E directory
		'.*\\.spec\\.ts$', // Exclude all .spec.ts files
		'.*\\.spec\\.tsx$', // Exclude all .spec.tsx files
	],

	// Module resolution for showcase app
	moduleNameMapper: {
		...rootConfig.moduleNameMapper,
		// Map relative imports within showcase
		'^@/(.*)$': '<rootDir>/src/$1',
	},
};
