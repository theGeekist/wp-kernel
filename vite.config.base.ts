import { defineConfig, type UserConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
// eslint-disable-next-line camelcase
import { wp_globals } from '@kucrut/vite-for-wp/utils';

import { FRAMEWORK_PEERS } from '@wpkernel/scripts/config/framework-peers';

// Accept array OR predicate for externals
type ExternalOpt = Array<string | RegExp> | ((id: string) => boolean);

type KernelLibConfigOptions = {
	/** Additional Rollup externals specific to the package. */
	external?: ExternalOpt;
	/** Enable production console/debugger drop (default: true) */
	dropConsoleInProd?: boolean;
};

/**
 * Create a Vite configuration for WP Kernel library packages.
 *
 * @param packageName - The package name (e.g., '@wpkernel/core')
 * @param entries     - Entry points (e.g., { index: 'src/index.ts', http: 'src/http/index.ts' })
 * @param options
 */
export const createWPKLibConfig = (
	packageName: string,
	entries: Record<string, string>,
	options: KernelLibConfigOptions = {}
): UserConfig => {
	const mode = process.env.NODE_ENV ?? 'development';
	const isProd = mode === 'production';

	// WordPress “module ids” known to WP (via vite-for-wp utils)
	const wpIds = Object.keys(wp_globals());

	// Normalise externals to Rollup’s accepted shapes (array OR function)
	const userExternal = options.external;

	const escapeRegex = (value: string): string =>
		value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

	const peerExternal: Array<string | RegExp> = Object.entries(
		FRAMEWORK_PEERS
	).map(([dependency, spec]) =>
		spec.kind === 'internal'
			? new RegExp(`^${escapeRegex(dependency)}(\/.*)?$`)
			: dependency
	);

	// Default external capability:
	// - All WP ids (incl. any @wordpress/*)
	// - React bits (just in case something imports jsx-runtime)
	// - Other wpk packages (avoid circular bundling across workspace)
	// - Node built-ins (string & 'node:' resolver)
	// - A few heavy tools used by CLI/plugins (left external on purpose)
	const defaultExternalArray: Array<string | RegExp> = [
		...wpIds,
		...peerExternal,
		'react/jsx-runtime',
		/^node:/,
		'fs',
		'fs/promises',
		'path',
		'url',
		'crypto',
		'util',
		'module',
		'os',
		'tty',
		'worker_threads',
		'child_process',
		'assert',
		'process',
		'v8',
		'net',
		'prettier',
		'prettier/standalone',
		'@prettier/plugin-php',
		'tsx',
		'tsx/esm/api',
	];

	const rollupExternal: ExternalOpt =
		typeof userExternal === 'function'
			? (id: string) =>
					// honour user predicate first
					userExternal(id) ||
					// then our defaults
					defaultExternalArray.some((pat) =>
						typeof pat === 'string' ? pat === id : pat.test(id)
					)
			: [...defaultExternalArray, ...(userExternal ?? [])];

	return defineConfig({
		build: {
			lib: {
				entry: Object.fromEntries(
					Object.entries(entries).map(([name, p]) => [
						name,
						resolve(process.cwd(), p),
					])
				),
				formats: ['es'], // ESM only
				fileName: (_format, entryName) => `${entryName}.js`,
			},
			target: 'es2022', // better DCE & smaller helpers
			outDir: 'dist',
			sourcemap: !isProd, // small prod artefacts
			emptyOutDir: true,
			minify: isProd ? 'esbuild' : false,
			rollupOptions: {
				// Don’t bundle peers/WP/Node/etc.
				external: rollupExternal,
				output: {
					exports: 'named',
					preserveModules: true, // keep module graph; plays well with TS paths
					preserveModulesRoot: 'src',
					entryFileNames: '[name].js',
					banner: `/**
 * ${packageName}
 * @license EUPL-1.2
 */`,
				},
				treeshake: {
					moduleSideEffects: false,
					propertyReadSideEffects: false,
					tryCatchDeoptimization: false,
					unknownGlobalSideEffects: false,
				},
			},
		},

		// Help DCE across dependencies that check NODE_ENV
		define: {
			'process.env.NODE_ENV': JSON.stringify(
				isProd ? 'production' : 'development'
			),
		},

		// Optional prod trimming; safe for libs
		esbuild:
			isProd && (options.dropConsoleInProd ?? true)
				? { drop: ['console', 'debugger'] }
				: undefined,

		plugins: [
			dts({
				include: [
					'src/**/*.ts',
					'src/**/*.tsx',
					'../../types/**/*.d.ts',
				],
				outDir: 'dist',
				rollupTypes: false, // avoid TS version mismatch warnings
			}),
		],
	});
};
