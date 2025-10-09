/**
 * Jest configuration for Showcase app
 * Extends base config from monorepo root
 */

import path from 'path';
import { fileURLToPath } from 'url';
import baseConfig from '../../jest.config.base.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(__dirname, '../..');

export default {
	...baseConfig,

	// Set display name for this project
	displayName: 'wp-kernel-showcase',

	// Root directory for this package
	rootDir: monorepoRoot,

	// Only test files in this app
	testMatch: [
		'<rootDir>/app/showcase/**/__tests__/**/*.test.ts',
		'<rootDir>/app/showcase/**/__tests__/**/*.test.tsx',
		// Explicitly exclude spec files (these are E2E tests for Playwright)
		'!**/__tests__/**/*.spec.ts',
		'!**/__tests__/**/*.spec.tsx',
	],

	// Additional ignore patterns specific to showcase
	testPathIgnorePatterns: [
		...baseConfig.testPathIgnorePatterns,
		'/__tests__/e2e/', // Exclude entire E2E directory
		'/e2e/', // Exclude any top-level E2E directory
	],

	// Module resolution for showcase app
	moduleNameMapper: {
		...baseConfig.moduleNameMapper,
		'^@test-utils/(.*)\\.js$': '<rootDir>/tests/test-utils/$1',
		'^@test-utils/(.*)$': '<rootDir>/tests/test-utils/$1',
		// Map relative imports within showcase
		'^@/(.*)$': '<rootDir>/app/showcase/src/$1',
		// Ensure kernel packages resolve correctly from showcase context
		'^@geekist/wp-kernel$': '<rootDir>/packages/kernel/src',
		'^@geekist/wp-kernel/(.*)$': '<rootDir>/packages/kernel/src/$1',
		'^@geekist/wp-kernel-ui$': '<rootDir>/packages/ui/src',
		'^@geekist/wp-kernel-ui/(.*)$': '<rootDir>/packages/ui/src/$1',
		'^@geekist/wp-kernel-cli$': '<rootDir>/packages/cli/src',
		'^@geekist/wp-kernel-cli/(.*)$': '<rootDir>/packages/cli/src/$1',
		'^@geekist/wp-kernel-e2e-utils$': '<rootDir>/packages/e2e-utils/src',
		'^@geekist/wp-kernel-e2e-utils/(.*)$':
			'<rootDir>/packages/e2e-utils/src/$1',
	},

	// Setup files
	setupFilesAfterEnv: ['<rootDir>/tests/setup-jest.ts'],
};
