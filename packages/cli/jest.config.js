/**
 * Jest configuration for @wpkernel/cli package
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
	displayName: '@wpkernel/cli',

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
		'^@wpkernel/core$': '<rootDir>/packages/core/src',
		'^@wpkernel/core/(.*)$': '<rootDir>/packages/core/src/$1',
		'^@wpkernel/ui$': '<rootDir>/packages/ui/src',
		'^@wpkernel/ui/(.*)$': '<rootDir>/packages/ui/src/$1',
		'^@wpkernel/cli$': '<rootDir>/packages/cli/src',
		'^@wpkernel/cli/(.*)$': '<rootDir>/packages/cli/src/$1',
		'^@wpkernel/e2e-utils$': '<rootDir>/packages/e2e-utils/src',
		'^@wpkernel/e2e-utils/(.*)$': '<rootDir>/packages/e2e-utils/src/$1',
		'^@wpkernel/test-utils$': '<rootDir>/packages/test-utils/src',
		'^@wpkernel/test-utils/(.*)$': '<rootDir>/packages/test-utils/src/$1',
		'^@wpkernel/php-json-ast$': '<rootDir>/packages/php-json-ast/src',
		'^@wpkernel/php-json-ast/(.*)$':
			'<rootDir>/packages/php-json-ast/src/$1',
		'^@wpkernel/php-driver$': '<rootDir>/packages/php-driver/src',
		'^@wpkernel/php-driver/(.*)$': '<rootDir>/packages/php-driver/src/$1',
	},

	// Setup files
	setupFilesAfterEnv: ['<rootDir>/tests/setup-jest.ts'],

	coveragePathIgnorePatterns: [
		...(baseConfig.coveragePathIgnorePatterns ?? []),
		'<rootDir>/packages/cli/src/ir/__fixtures__',
	],

	// Only collect coverage for this package's source files. This prevents
	// coverage from including other workspace packages (for example
	// @wpkernel/core) which would dilute the package's reported
	// coverage and make per-package targets hard to achieve.
	collectCoverageFrom: [
		'<rootDir>/packages/cli/src/**/*.{ts,tsx}',
		// exclude tests, fixtures and intentional placeholders
		'!<rootDir>/packages/cli/src/**/__tests__/**',
		'!<rootDir>/packages/cli/src/**/__test-support__/**',
		'!<rootDir>/packages/cli/src/**/*.test-support.ts',
		'!<rootDir>/packages/cli/src/ir/__fixtures__/**',
		'!<rootDir>/packages/cli/src/index.ts',
		'!<rootDir>/packages/cli/src/version.ts',
		'!<rootDir>/packages/cli/src/cli/**',
		'!<rootDir>/packages/cli/src/commands/**',
		'!<rootDir>/packages/cli/src/internal/**',
		'!<rootDir>/packages/cli/src/printers/**',
		'!<rootDir>/packages/cli/src/printers/php/**',
		'!<rootDir>/packages/cli/src/ir/index.ts',
	],

	// Coverage thresholds for this package
	coverageThreshold: {
		global: {
			branches: 85,
			functions: 90,
			lines: 90,
			statements: 90,
		},
	},
};
