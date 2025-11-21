import path from 'node:path';
import { VITE_CONFIG_FILENAME } from './bundler.constants';
import type { RollupDriverConfig } from './types';

function toRelativeImport(from: string, target: string): string {
	const relative = path.posix
		.relative(path.posix.dirname(from), target)
		.replace(/\\/g, '/');
	if (relative.startsWith('./') || relative.startsWith('../')) {
		return relative;
	}

	return `./${relative}`;
}

export function buildViteConfigSource(options: {
	readonly bundlerConfigPath: string;
	readonly driverConfig: RollupDriverConfig;
}): string {
	const importPath = toRelativeImport(
		VITE_CONFIG_FILENAME,
		options.bundlerConfigPath
	);

	return [
		"import { defineConfig, type UserConfig } from 'vite';",
		"import { v4wp } from '@kucrut/vite-for-wp';",
		`import bundlerConfig from '${importPath}';`,
		'',
		"const isProduction = process.env.NODE_ENV === 'production';",
		'const sourceMapConfig = isProduction',
		'  ? bundlerConfig.sourcemap?.production ?? false',
		'  : bundlerConfig.sourcemap?.development ?? true;',
		'',
		'export default defineConfig((): UserConfig => ({',
		'  plugins: [',
		'    v4wp({',
		'      input: bundlerConfig.input,',
		'      outDir: bundlerConfig.outputDir,',
		'    }),',
		'  ],',
		'  build: {',
		'    sourcemap: sourceMapConfig,',
		'    rollupOptions: {',
		'      external: bundlerConfig.external,',
		'      output: {',
		"        entryFileNames: '[name].js',",
		'        format: bundlerConfig.format,',
		'        globals: bundlerConfig.globals,',
		'      },',
		'    },',
		'  },',
		'  optimizeDeps: bundlerConfig.optimizeDeps,',
		'  resolve: { alias: bundlerConfig.alias },',
		'}));',
		'',
	].join('\n');
}
