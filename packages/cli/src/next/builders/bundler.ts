import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import type { Reporter } from '@wpkernel/core/reporter';
import { createHelper } from '../helper';
import type {
	BuilderHelper,
	BuilderOutput,
	PipelineContext,
} from '../runtime/types';
import type { Workspace } from '../workspace/types';

const BUNDLER_TRANSACTION_LABEL = 'builder.generate.bundler.core';
const BUNDLER_CONFIG_PATH = path.posix.join('.wpk', 'bundler', 'config.json');
const ASSET_MANIFEST_PATH = path.posix.join(
	'.wpk',
	'bundler',
	'assets',
	'index.asset.json'
);

const DEFAULT_ENTRY_POINT = 'src/index.ts';
const DEFAULT_ENTRY_KEY = 'index';
const DEFAULT_OUTPUT_DIR = 'build';
const DEFAULT_ASSET_PATH = path.posix.join(
	DEFAULT_OUTPUT_DIR,
	'index.asset.json'
);

const DEFAULT_WORDPRESS_EXTERNALS = [
	'@wordpress/dataviews',
	'@wordpress/data',
	'@wordpress/components',
	'@wordpress/element',
	'@wordpress/hooks',
	'@wordpress/i18n',
	'@wordpress/interactivity',
];

const REACT_EXTERNALS = [
	'react',
	'react-dom',
	'react/jsx-runtime',
	'react/jsx-dev-runtime',
];

interface PackageJsonLike {
	readonly name?: string;
	readonly version?: string;
	readonly peerDependencies?: Record<string, string>;
	readonly dependencies?: Record<string, string>;
}

interface RollupDriverConfig {
	readonly driver: 'rollup';
	readonly input: Record<string, string>;
	readonly outputDir: string;
	readonly format: 'esm';
	readonly external: readonly string[];
	readonly globals: Record<string, string>;
	readonly alias: readonly {
		readonly find: string;
		readonly replacement: string;
	}[];
	readonly sourcemap: {
		readonly development: boolean;
		readonly production: boolean;
	};
	readonly optimizeDeps: { readonly exclude: readonly string[] };
	readonly assetManifest: { readonly path: string };
}

interface AssetManifest {
	readonly entry: string;
	readonly dependencies: readonly string[];
	readonly version: string;
	readonly file: string;
}

interface RollupDriverArtifacts {
	readonly config: RollupDriverConfig;
	readonly assetManifest: AssetManifest;
}

function sortUnique(values: Iterable<string>): string[] {
	return Array.from(new Set(values)).sort();
}

export function toWordPressGlobal(slug: string): string {
	const segments = slug.split('-');
	const formatted = segments
		.map((segment, index) => {
			if (index === 0) {
				return segment;
			}

			if (segment.length === 0) {
				return segment;
			}

			return segment[0]?.toUpperCase() + segment.slice(1);
		})
		.join('');

	return `wp.${formatted}`;
}

export function toWordPressHandle(slug: string): string {
	return `wp-${slug}`;
}

export function createExternalList(pkg: PackageJsonLike | null): string[] {
	const peerDeps = Object.keys(pkg?.peerDependencies ?? {});
	const deps = Object.keys(pkg?.dependencies ?? {});

	return sortUnique([
		...peerDeps,
		...deps,
		...DEFAULT_WORDPRESS_EXTERNALS,
		...REACT_EXTERNALS,
	]);
}

export function createGlobals(
	externals: readonly string[]
): Record<string, string> {
	const globals: Record<string, string> = {};

	for (const dependency of externals) {
		if (dependency === 'react') {
			globals[dependency] = 'React';
			continue;
		}

		if (dependency === 'react-dom') {
			globals[dependency] = 'ReactDOM';
			continue;
		}

		if (
			dependency === 'react/jsx-runtime' ||
			dependency === 'react/jsx-dev-runtime'
		) {
			globals[dependency] = 'React';
			continue;
		}

		if (dependency.startsWith('@wordpress/')) {
			const [, slug = ''] = dependency.split('/');
			globals[dependency] = toWordPressGlobal(slug);
		}
	}

	return globals;
}

export function createAssetDependencies(
	externals: readonly string[]
): string[] {
	const dependencies = new Set<string>();

	for (const dependency of externals) {
		if (dependency.startsWith('@wordpress/')) {
			const [, slug = ''] = dependency.split('/');
			if (slug) {
				dependencies.add(toWordPressHandle(slug));
			}
			continue;
		}

		if (REACT_EXTERNALS.includes(dependency)) {
			dependencies.add('wp-element');
		}
	}

	return Array.from(dependencies).sort();
}

export function normaliseAliasReplacement(replacement: string): string {
	if (replacement.endsWith('/')) {
		return replacement;
	}

	return `${replacement}/`;
}

export function createHashedFileName(version: string): string {
	const sanitized = version.replace(/[^a-zA-Z0-9]/g, '');
	if (sanitized.length === 0) {
		return `${DEFAULT_ENTRY_KEY}.js`;
	}
	return `${DEFAULT_ENTRY_KEY}-${sanitized}.js`;
}

export function createRollupDriverArtifacts(
	pkg: PackageJsonLike | null,
	options: { readonly aliasRoot?: string } = {}
): RollupDriverArtifacts {
	const externals = createExternalList(pkg);
	const globals = createGlobals(externals);
	const assetDependencies = createAssetDependencies(externals);
	const aliasRoot = options.aliasRoot ?? './src';
	const version = pkg?.version ?? '0.0.0';

	const config: RollupDriverConfig = {
		driver: 'rollup',
		input: { [DEFAULT_ENTRY_KEY]: DEFAULT_ENTRY_POINT },
		outputDir: DEFAULT_OUTPUT_DIR,
		format: 'esm',
		external: externals,
		globals,
		alias: [
			{
				find: '@/',
				replacement: normaliseAliasReplacement(aliasRoot),
			},
		],
		sourcemap: {
			development: true,
			production: false,
		},
		optimizeDeps: {
			exclude: externals,
		},
		assetManifest: {
			path: DEFAULT_ASSET_PATH,
		},
	} satisfies RollupDriverConfig;

	const hashedFile = path.posix.join(
		DEFAULT_OUTPUT_DIR,
		createHashedFileName(version)
	);

	const assetManifest: AssetManifest = {
		entry: DEFAULT_ENTRY_KEY,
		dependencies: assetDependencies,
		version,
		file: hashedFile,
	} satisfies AssetManifest;

	return { config, assetManifest };
}

export async function readPackageJson(
	workspace: Workspace
): Promise<PackageJsonLike | null> {
	const contents = await workspace.readText('package.json');
	if (!contents) {
		return null;
	}

	try {
		return JSON.parse(contents) as PackageJsonLike;
	} catch (error) {
		throw new SyntaxError(
			`Failed to parse workspace package.json: ${(error as Error).message}`
		);
	}
}

export async function queueManifestWrites(
	context: PipelineContext,
	output: BuilderOutput,
	files: readonly string[]
): Promise<void> {
	for (const file of files) {
		const contents = await context.workspace.read(file);
		if (!contents) {
			continue;
		}

		output.queueWrite({ file, contents });
	}
}

export async function runViteBuild({
	workspace,
	reporter,
}: {
	readonly workspace: Workspace;
	readonly reporter: Reporter;
}): Promise<void> {
	reporter.info('Running production bundler build via Vite.');

	const child: ChildProcess = spawn('pnpm', ['exec', 'vite', 'build'], {
		cwd: workspace.cwd(),
		env: { ...process.env, NODE_ENV: 'production' },
		stdio: 'inherit',
	});

	await new Promise<void>((resolve, reject) => {
		let settled = false;
		const settle = (fn: () => void) => {
			if (!settled) {
				settled = true;
				fn();
			}
		};
		child.once('error', (error) => {
			reporter.warn('Bundler process failed to start.', {
				error: (error as Error).message,
			});
			settle(() => reject(error));
		});
		child.once('exit', (code) => {
			if (code === 0) {
				reporter.info('Bundler build completed.');
				settle(resolve);
				return;
			}

			const error = new Error(
				`Bundler build failed with exit code ${code ?? -1}.`
			);
			reporter.warn('Bundler exited with non-zero status.', {
				exitCode: code,
			});
			settle(() => reject(error));
		});
	});
}

export interface CreateBundlerOptions {
	readonly run?: (context: {
		workspace: Workspace;
		reporter: Reporter;
	}) => Promise<void>;
}

export function createBundler(
	options: CreateBundlerOptions = {}
): BuilderHelper {
	return createHelper({
		key: 'builder.generate.bundler.core',
		kind: 'builder',
		async apply({ context, input, output, reporter }) {
			if (input.phase !== 'generate' && input.phase !== 'build') {
				reporter.debug(
					'createBundler: skipping phase without bundler support.',
					{ phase: input.phase }
				);
				return;
			}

			context.workspace.begin(BUNDLER_TRANSACTION_LABEL);

			try {
				const pkg = await readPackageJson(context.workspace);
				const artifacts = createRollupDriverArtifacts(pkg, {
					aliasRoot: './src',
				});

				await context.workspace.writeJson(
					BUNDLER_CONFIG_PATH,
					artifacts.config,
					{
						pretty: true,
					}
				);
				await context.workspace.writeJson(
					ASSET_MANIFEST_PATH,
					artifacts.assetManifest,
					{ pretty: true }
				);

				await context.workspace.write(
					artifacts.assetManifest.file,
					'// AUTO-GENERATED bundler placeholder\n'
				);

				const manifest = await context.workspace.commit(
					BUNDLER_TRANSACTION_LABEL
				);
				await queueManifestWrites(context, output, manifest.writes);

				reporter.debug('Bundler configuration generated.', {
					files: manifest.writes,
				});

				if (input.phase === 'build') {
					const runner = options.run ?? runViteBuild;
					await runner({ workspace: context.workspace, reporter });
				}
			} catch (error) {
				await context.workspace.rollback(BUNDLER_TRANSACTION_LABEL);
				throw error;
			}
		},
	});
}
