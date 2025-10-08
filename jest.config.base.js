/**
 * Base Jest configuration for WP Kernel monorepo packages
 * Individual packages should extend this configuration
 */

// eslint-disable-next-line import/no-default-export
export default {
	preset: '@wordpress/jest-preset-default',
	testEnvironment: 'jsdom',

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

	// Module resolution - packages will need to override this
	// with their specific paths relative to monorepo root
	moduleNameMapper: {
		// Strip .js extensions for Jest (TypeScript source files are .ts)
		'^(\\.{1,2}/.*)\\.js$': '$1',
	},

	// Test file patterns
	testMatch: [
		'**/__tests__/**/*.ts',
		'**/__tests__/**/*.tsx',
		'**/__tests__/**/*.test.ts',
		'**/__tests__/**/*.test.tsx',
	],

	// Ignore patterns
	testPathIgnorePatterns: [
		'/node_modules/',
		'/dist/',
		'/build/',
		'/.wp-env/',
		'/tests/test-globals.d.ts',
		'.spec.ts$', // Exclude Playwright spec files
	],

	// Performance
	maxWorkers: '50%',
};
