/**
 * Vite configuration for WP Kernel Showcase Plugin
 *
 * Uses @kucrut/vite-for-wp to build WordPress assets with proper externals.
 * Outputs ESM modules for WordPress Script Modules API.
 *
 * IMPORTANT: The wp_scripts helper requires these peer dependencies:
 * - rollup-plugin-external-globals@^0.13
 * - vite-plugin-external@^6
 *
 * Without these, WordPress packages will be bundled instead of externalized,
 * causing duplicate registries and store access failures.
 */

import { defineConfig, type UserConfig } from 'vite';
import { resolve } from 'path';
import { v4wp } from '@kucrut/vite-for-wp';
import { wp_scripts as wpScripts } from '@kucrut/vite-for-wp/plugins';

export default defineConfig(async (_env): Promise<UserConfig> => {
	const wpScriptsPlugins = await wpScripts({
		extraScripts: {
			'@wordpress/interactivity': 'wp.interactivity',
		},
	});

	const config: UserConfig = {
		plugins: [
			v4wp({
				// Input files (Script Modules entry points)
				input: {
					index: 'src/index.ts',
				},
				// Output directory
				outDir: 'build',
			}),
			...wpScriptsPlugins,
		],

		build: {
			// Ensure ESM output (for Script Modules)
			rollupOptions: {
				output: {
					// Use [name].js for main files
					entryFileNames: '[name].js',
					chunkFileNames: '[name]-[hash].js',
					assetFileNames: '[name]-[hash][extname]',
				},
			},
			// Enable sourcemaps for development
			sourcemap: true,
			// Don't minify in dev
			minify: process.env.NODE_ENV === 'production',
		},

		// Resolve workspace packages
		resolve: {
			alias: {
				'@geekist/wp-kernel': resolve(
					__dirname,
					'../../packages/kernel/src/index.ts'
				),
				'@geekist/wp-kernel/http': resolve(
					__dirname,
					'../../packages/kernel/src/http/index.ts'
				),
				'@geekist/wp-kernel/resource': resolve(
					__dirname,
					'../../packages/kernel/src/resource/index.ts'
				),
				'@geekist/wp-kernel/error': resolve(
					__dirname,
					'../../packages/kernel/src/error/index.ts'
				),
				'@geekist/wp-kernel-ui': resolve(
					__dirname,
					'../../packages/ui/src/index.ts'
				),
			},
		},

		optimizeDeps: {
			exclude: [
				'react',
				'react-dom',
				'react/jsx-runtime',
				'@wordpress/components',
				'@wordpress/data',
				'@wordpress/element',
				'@wordpress/hooks',
				'@wordpress/i18n',
				'@wordpress/interactivity',
			],
		},
	};

	return config;
});
