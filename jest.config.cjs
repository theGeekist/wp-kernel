/**
 * Jest configuration for WP Kernel monorepo
 * Uses @wordpress/jest-preset-default for WordPress compatibility
 */

module.exports = {
	preset: '@wordpress/jest-preset-default',
	testEnvironment: 'jsdom',

	// Test file locations
	roots: ['<rootDir>/packages', '<rootDir>/app'],
	testMatch: [
		'**/__tests__/**/*.ts',
		'**/__tests__/**/*.tsx',
		'**/__tests__/**/*.test.ts',
		'**/__tests__/**/*.test.tsx',
	],

	// Module resolution
	moduleNameMapper: {
		// Strip .js extensions for Jest (TypeScript source files are .ts)
		'^(\\.{1,2}/.*)\\.js$': '$1',
		// Workspace package aliases
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

	// TypeScript transformation
	transform: {
		'^.+\\.tsx?$': [
			'ts-jest',
			{
				tsconfig: {
					jsx: 'react-jsx',
					esModuleInterop: true,
					allowSyntheticDefaultImports: true,
				},
			},
		],
	},

	// Coverage configuration
	collectCoverageFrom: [
		'packages/*/src/**/*.{ts,tsx}',
		// Exclude showcase app (example/demo code, not framework code)
		'!app/showcase/src/**',
		'!packages/*/src/**/*.d.ts',
		'!app/*/src/**/*.d.ts',
		'!packages/*/src/**/__tests__/**',
		'!app/*/src/**/__tests__/**',
		// Exclude entry point index files (trivial re-exports)
		'!packages/*/src/index.ts',
		'!packages/kernel/src/*/index.ts',
	],
	coverageThreshold: {
		global: {
			branches: 89,
			functions: 90,
			lines: 90,
			statements: 90,
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
	],

	// Setup files
	setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],

	// Performance
	maxWorkers: '50%',
};
