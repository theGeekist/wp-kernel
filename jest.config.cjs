/**
 * Jest configuration for WP Kernel monorepo
 * Uses @wordpress/jest-preset-default for WordPress compatibility
 */

module.exports = {
	preset: '@wordpress/jest-preset-default',
	testEnvironment: 'jsdom',

	// Test file locations
	roots: ['<rootDir>/packages'],
	testMatch: [
		'**/__tests__/**/*.ts',
		'**/__tests__/**/*.tsx',
		'**/?(*.)+(spec|test).ts',
		'**/?(*.)+(spec|test).tsx',
	],

	// Module resolution
	moduleNameMapper: {
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
		'!packages/*/src/**/*.d.ts',
		'!packages/*/src/**/__tests__/**',
		'!packages/*/src/**/index.ts', // Entry points often just re-export
	],
	coverageThreshold: {
		global: {
			branches: 80,
			functions: 80,
			lines: 80,
			statements: 80,
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
	],

	// Setup files
	setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],

	// Performance
	maxWorkers: '50%',
};
