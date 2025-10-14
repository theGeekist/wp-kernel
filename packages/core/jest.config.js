/**
 * Jest configuration for @wpkernel/core package
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
	displayName: '@wpkernel/core',

	// Root directory for this package
	rootDir: monorepoRoot,

	// Only test files in this package
	testMatch: [
		'<rootDir>/packages/core/**/__tests__/**/*.ts',
		'<rootDir>/packages/core/**/__tests__/**/*.tsx',
		'<rootDir>/packages/core/**/__tests__/**/*.test.ts',
		'<rootDir>/packages/core/**/__tests__/**/*.test.tsx',
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
	},

	// Setup files
	setupFilesAfterEnv: ['<rootDir>/tests/setup-jest.ts'],

	// Coverage collection for this package only
	collectCoverageFrom: [
		'<rootDir>/packages/core/src/**/*.{ts,tsx}',
		'!<rootDir>/packages/core/src/**/__tests__/**',
		'!<rootDir>/packages/core/src/**/*.d.ts',
		'!<rootDir>/packages/core/src/index.ts',
		'!<rootDir>/packages/core/src/*/index.ts',
	],

	// Coverage thresholds for this package
	coverageThreshold: {
		global: {
			branches: 90,
			functions: 90,
			lines: 90,
			statements: 90,
		},
	},
};
