/**
 * ESLint Configuration for WP Kernel
 *
 * Extends WordPress coding standards with custom rules for the framework.
 */

module.exports = {
	root: true,

	extends: ['plugin:@wordpress/eslint-plugin/recommended'],

	parser: '@typescript-eslint/parser',

	parserOptions: {
		ecmaVersion: 2022,
		sourceType: 'module',
		ecmaFeatures: {
			jsx: true,
		},
	},

	env: {
		browser: true,
		node: true,
		es2022: true,
	},

	settings: {
		react: {
			version: 'detect',
		},
	},

	// Custom rules for WP Kernel
	rules: {
		// Enforce no deep imports across packages (must use public entry points)
		'no-restricted-imports': [
			'error',
			{
				patterns: [
					{
						group: ['**/packages/*/src/**'],
						message:
							'Deep package imports are forbidden. Use public entry points like @geekist/wp-kernel instead.',
					},
				],
			},
		],

		// Allow console in development (can be overridden per package)
		'no-console': 'off',

		// Prefer named exports for better tree-shaking
		'import/prefer-default-export': 'off',
		'import/no-default-export': 'warn',
	},

	overrides: [
		// TypeScript files
		{
			files: ['*.ts', '*.tsx'],
			extends: ['plugin:@typescript-eslint/recommended'],
			rules: {
				'@typescript-eslint/no-unused-vars': [
					'error',
					{
						argsIgnorePattern: '^_',
						varsIgnorePattern: '^_',
						caughtErrorsIgnorePattern: '^_',
					},
				],
				'@typescript-eslint/consistent-type-imports': [
					'warn',
					{
						prefer: 'type-imports',
						fixStyle: 'inline-type-imports',
					},
				],
			},
		},

		// Test files - more relaxed rules
		{
			files: [
				'**/*.test.ts',
				'**/*.test.tsx',
				'**/*.spec.ts',
				'**/*.spec.tsx',
				'**/test/**',
				'**/tests/**',
			],
			rules: {
				'no-console': 'off',
				'@typescript-eslint/no-explicit-any': 'off',
				'import/no-default-export': 'off',
			},
		},

		// Config files can use default exports
		{
			files: [
				'*.config.js',
				'*.config.ts',
				'*.config.cjs',
				'*.config.mjs',
			],
			rules: {
				'import/no-default-export': 'off',
			},
		},

		// JSON files - disable all rules
		{
			files: ['*.json'],
			rules: {
				'no-unused-expressions': 'off',
			},
		},
	],
};
