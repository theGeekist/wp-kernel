/**
 * Base Jest configuration for WP Kernel monorepo packages
 * Individual packages should extend this configuration
 */

// eslint-disable-next-line import/no-default-export
export default {
	preset: '@wordpress/jest-preset-default',
	testEnvironment: 'jsdom',
	// coverageProvider: 'v8',
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
		'^(?:.+/)?eslint-rules/.+\\.js$': [
			'ts-jest',
			{
				tsconfig: {
					allowJs: true,
					esModuleInterop: true,
				},
			},
		],
	},

	// Module resolution - packages will need to override this
	// with their specific paths relative to monorepo root
	moduleNameMapper: {
		// Strip .js extensions for Jest (TypeScript source files are .ts)
		'^(\\.{1,2}/.*)\\.js$': '$1',
		'^@eslint/eslintrc/universal$':
			'<rootDir>/node_modules/@eslint/eslintrc/universal.js',
		'^@eslint/eslintrc$':
			'<rootDir>/node_modules/@eslint/eslintrc/universal.js',
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

	// Disable watchman - use node's fs.watch instead
	// Watchman can cause issues in monorepos and isn't needed for one-off test runs
	// Watch mode will still work fine with Node's built-in file watcher
	watchman: false,

	// Performance
	maxWorkers: '50%',

	// Coverage thresholds
	// Individual packages should override these if needed
	coverageThreshold: {
		global: {
			branches: 89,
			functions: 90,
			lines: 90,
			statements: 90,
		},
	},
};
