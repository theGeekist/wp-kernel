/**
 * Jest configuration for WP Kernel monorepo
 * Uses @wordpress/jest-preset-default for WordPress compatibility
 *
 * This is the root configuration that runs all tests from the monorepo root.
 * Individual packages can also run tests independently using their own configs.
 */

import baseConfig from './jest.config.base.js';

export default {
	...baseConfig,

	// Test file locations
	roots: ['<rootDir>/packages', '<rootDir>/examples', '<rootDir>/tests'],

	// Module resolution for monorepo root
	moduleNameMapper: {
		...baseConfig.moduleNameMapper,
		// Test utilities (with and without .js extension)
		'^@test-utils/(.*)\\.js$': '<rootDir>/tests/test-utils/$1',
		'^@test-utils/(.*)$': '<rootDir>/tests/test-utils/$1',
		// Ensure automatic JSX runtime resolves during tests
		'^@wordpress/element/jsx-runtime$': 'react/jsx-runtime',
		// Workspace package aliases
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
	},

	// Coverage configuration
	collectCoverageFrom: [
		'packages/*/src/**/*.{ts,tsx}',
		// Exclude showcase app (example/demo code, not framework code)
		'!examples/showcase/src/**',
		// Exclude e2e-utils (browser-only code, can't be unit tested in JSDOM)
		'!packages/e2e-utils/src/**',
		// Exclude testing utilities (test helpers, not production code)
		'!packages/ui/src/hooks/testing/**',
		// Exclude CLI package files that can't be unit tested in isolation
		'!packages/cli/src/cli/**', // CLI entry points (require process, filesystem)
		'!packages/cli/src/commands/**', // Command implementations (file I/O, tested integration-style)
		'!packages/cli/src/internal/**', // Internal constants (trivial)
		'!packages/cli/src/printers/**', // File printers (tested indirectly via IR tests)
		'!packages/cli/src/version.ts', // Auto-generated version constant
		'!packages/cli/src/ir/__fixtures__/**', // Test fixtures
		// Exclude dataviews test-support helpers from coverage
		'!<rootDir>/packages/ui/src/dataviews/test-support/**',
		// Exclude type definitions and tests
		'!packages/*/src/**/*.d.ts',
		'!examples/*/src/**/*.d.ts',
		'!packages/*/src/**/__tests__/**',
		'!examples/*/src/**/__tests__/**',
		// Exclude entry point index files (trivial re-exports)
		'!packages/*/src/index.ts',
		'!packages/core/src/*/index.ts',
		'!packages/cli/src/ir/index.ts',
	],
	coverageThreshold: {
		global: {
			branches: 80,
			functions: 83,
			lines: 88,
			statements: 88,
		},
	},
	coverageDirectory: '<rootDir>/coverage',
	coverageReporters: ['text', 'lcov', 'html'],

	// Ignore patterns
	testPathIgnorePatterns: [
		'/node_modules/',
		'/dist/',
		'/build/',
		'/.wp-env/',
		'/packages/e2e-utils/tests/', // Exclude Playwright E2E tests
		'/__tests__/e2e/', // Exclude all E2E test directories
		'/tests/test-globals.d.ts', // Exclude ambient type declarations
		'/tests/setup-jest.ts', // Exclude setup file from being run as test
		'.spec.ts$', // Exclude Playwright spec files
	],

	// Setup files
	setupFilesAfterEnv: ['<rootDir>/tests/setup-jest.ts'],
};
