import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
	plugins: [tsconfigPaths()],
	build: {
		lib: {
			entry: [
				'src/index.ts',
				'src/wp/index.ts',
				'src/integration/index.ts',
				'src/cli/index.ts',
				'src/core/index.ts',
				'src/ui/index.ts',
			],
			formats: ['cjs', 'es'],
		},
		outDir: 'dist',
		emptyOutDir: true,
		rollupOptions: {
			output: {
				preserveModules: true,
				preserveModulesRoot: 'src',
			},
		},
	},
});
