/**
 * Jest configuration for @geekist/wp-kernel-cli package
 * Extends base configuration from monorepo root
 */

import path from 'path';
import { fileURLToPath } from 'url';
import baseConfig from '../../jest.config.base.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Calculate monorepo root from this package
const monorepoRoot = path.resolve(__dirname, '../..');

export default {
	...baseConfig,

	// Set display name for this project
	displayName: '@geekist/wp-kernel-cli',

	// Root directory for this package
	rootDir: monorepoRoot,

	// Only test files in this package
	testMatch: [
		'<rootDir>/packages/cli/**/__tests__/**/*.ts',
		'<rootDir>/packages/cli/**/__tests__/**/*.tsx',
		'<rootDir>/packages/cli/**/__tests__/**/*.test.ts',
		'<rootDir>/packages/cli/**/__tests__/**/*.test.tsx',
	],

	// Module resolution
	moduleNameMapper: {
		...baseConfig.moduleNameMapper,
		'^@test-utils/(.*)\\.js$': '<rootDir>/tests/test-utils/$1',
		'^@test-utils/(.*)$': '<rootDir>/tests/test-utils/$1',
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
