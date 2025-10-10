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

	// Only collect coverage for this package's source files. This prevents
	// coverage from including other workspace packages (for example
	// @geekist/wp-kernel) which would dilute the package's reported
	// coverage and make per-package targets hard to achieve.
	collectCoverageFrom: [
		'<rootDir>/packages/cli/src/**/*.{ts,tsx}',
		// exclude tests, fixtures and intentional placeholders
		'!<rootDir>/packages/cli/src/**/__tests__/**',
		'!<rootDir>/packages/cli/src/ir/__fixtures__/**',
		'!<rootDir>/packages/cli/src/index.ts',
		'!<rootDir>/packages/cli/src/version.ts',
		'!<rootDir>/packages/cli/src/cli/**',
		'!<rootDir>/packages/cli/src/commands/index.ts',
		'!<rootDir>/packages/cli/src/commands/init.ts',
		'!<rootDir>/packages/cli/src/commands/doctor.ts',
		'!<rootDir>/packages/cli/src/internal/**',
		'!<rootDir>/packages/cli/src/printers/**',
		'!<rootDir>/packages/cli/src/printers/php/**',
		'!<rootDir>/packages/cli/src/ir/index.ts',
	],
};
