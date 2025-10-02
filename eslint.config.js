/**
 * ESLint Configuration for WP Kernel (Flat Config)
 *
 * Extends WordPress coding standards with custom rules for the framework.
 * @see https://eslint.org/docs/latest/use/configure/configuration-files-new
 */

import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
	baseDirectory: __dirname,
	recommendedConfig: js.configs.recommended,
});

export default [
	// Convert WordPress recommended config from legacy format
	...compat.extends('plugin:@wordpress/eslint-plugin/recommended'),

	// Global ignores
	{
		ignores: [
			'**/dist/**',
			'**/build/**',
			'**/node_modules/**',
			'**/.wordpress-cache/**',
			'**/information/**',
			'coverage/**',
			'.changeset/**',
			'**/*.php', // PHP files handled by PHPCS
		],
	},

	// Base configuration for all files
	{
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			parser: tsParser,
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
			globals: {
				...globals.browser,
				...globals.node,
				...globals.es2021,
			},
		},

		settings: {
			react: {
				version: 'detect',
			},
			'import/resolver': {
				typescript: {
					alwaysTryTypes: true,
					project: './tsconfig.base.json',
				},
			},
		},

		// Custom rules for WP Kernel
		rules: {
			// Disable problematic rule (ESLint 9 compatibility issue)
			'@wordpress/no-unused-vars-before-return': 'off',

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

			// Allow unresolved imports in config files (they're dev dependencies)
			'import/no-unresolved': [
				'error',
				{
					ignore: [
						'^@typescript-eslint/',
						'^@eslint/',
						'^globals$',
						'^@wordpress/',
						'^@kernel/',
						'^@geekist/wp-kernel',
					],
				},
			],
		},
	},

	// WordPress Script Modules - runtime-resolved imports
	{
		files: ['app/*/src/**/*.js', 'app/*/src/**/*.jsx'],
		rules: {
			'import/no-unresolved': [
				'error',
				{
					ignore: ['^@wordpress/'],
				},
			],
		},
	},

	// CLI bin files - runtime-resolved paths
	{
		files: ['packages/cli/bin/**/*.js'],
		rules: {
			'import/no-unresolved': 'off',
		},
	},

	// TypeScript files
	{
		files: ['**/*.ts', '**/*.tsx'],
		plugins: {
			'@typescript-eslint': tseslint,
		},
		rules: {
			...tseslint.configs.recommended.rules,
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

	// Config files can use default exports and devDependencies (root and nested)
	{
		files: [
			'*.config.js',
			'*.config.ts',
			'*.config.cjs',
			'*.config.mjs',
			'**/*.config.js',
			'**/*.config.ts',
			'**/*.config.cjs',
			'**/*.config.mjs',
		],
		rules: {
			'import/no-default-export': 'off',
			'import/no-extraneous-dependencies': [
				'error',
				{
					devDependencies: true,
					optionalDependencies: false,
					peerDependencies: false,
				},
			],
			// Allow multiple imports from packages with subpath exports (e.g., @kucrut/vite-for-wp and @kucrut/vite-for-wp/plugins)
			'import/no-duplicates': 'off',
		},
	},
];
