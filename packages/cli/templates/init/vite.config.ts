import { defineConfig, type UserConfig } from 'vite';
import { v4wp } from '@kucrut/vite-for-wp';
import packageJson from './package.json';

const peerDependencies = Object.keys(packageJson.peerDependencies ?? {});

function resolveGlobalName(dependency: string): string {
	if (dependency === 'react') {
		return 'React';
	}

	if (dependency === 'react-dom') {
		return 'ReactDOM';
	}

	if (dependency.startsWith('@wordpress/')) {
		const [, namespace] = dependency.split('/');
		return `wp.${namespace ?? ''}`;
	}

	return dependency;
}

export default defineConfig(
	(): UserConfig => ({
		plugins: [
			v4wp({
				input: {
					index: 'src/index.ts',
				},
				outDir: 'build',
			}),
		],
		build: {
			sourcemap: true,
			rollupOptions: {
				external: [
					...peerDependencies,
					'react/jsx-runtime',
					'react/jsx-dev-runtime',
				],
				output: {
					format: 'esm',
					entryFileNames: '[name].js',
					globals: Object.fromEntries(
						peerDependencies.map((dependency) => [
							dependency,
							resolveGlobalName(dependency),
						])
					),
				},
			},
		},
		optimizeDeps: {
			exclude: [
				...peerDependencies,
				'react/jsx-runtime',
				'react/jsx-dev-runtime',
			],
		},
	})
);
