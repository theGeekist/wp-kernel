import path from 'node:path';
import { createHelper } from '../runtime';
import { sanitizeNamespace } from '../adapters/extensions';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderInput,
	BuilderOutput,
	PipelineContext,
} from '../runtime/types';
import type { Workspace } from '../workspace/types';
import {
	type PackageJsonLike,
	type RollupDriverArtifacts,
	type AssetManifestUIEntry,
	type RollupDriverConfig,
	type AssetManifest,
} from './types';
import { resolveBundlerPaths } from './bundler.paths';
import type { IRResource, IRv1 } from '../ir/publicTypes';
import {
	resolveDependencyVersions,
	type DependencyResolution,
} from '../commands/init/dependency-versions';

const VITE_CONFIG_FILENAME = 'vite.config.ts';
const MONOREPO_DEP_DENYLIST = new Set([
	'loglayer',
	'@loglayer/shared',
	'@loglayer/transport',
	'@loglayer/transport-simple-pretty-terminal',
	'@wpkernel/cli',
	'@wpkernel/e2e-utils',
]);

const BUNDLER_TRANSACTION_LABEL = 'builder.generate.bundler.core';

const DEFAULT_ENTRY_POINT = 'src/index.ts';
const DEFAULT_ENTRY_KEY = 'index';
const DEFAULT_OUTPUT_DIR = 'build';
const DEFAULT_ALIAS_ROOT = './src';

const DEFAULT_PACKAGE_SCRIPTS: Record<string, string> = {
	start: 'wpk start',
	build: 'vite build',
	generate: 'wpk generate',
	apply: 'wpk apply',
};

const DEFAULT_WORDPRESS_EXTERNALS = [
	'@wordpress/dataviews',
	'@wordpress/data',
	'@wordpress/components',
	'@wordpress/element',
	'@wordpress/element/jsx-runtime',
	'@wordpress/element/jsx-dev-runtime',
	'@wordpress/hooks',
	'@wordpress/i18n',
	'@wordpress/interactivity',
	'@wordpress/api-fetch',
	'@wordpress/block-editor',
	'@wordpress/blocks',
];

const REACT_EXTERNALS = [
	'react',
	'react-dom',
	'react-dom/client',
	'react/jsx-runtime',
	'react/jsx-dev-runtime',
];

function sortUnique(values: Iterable<string>): string[] {
	return Array.from(new Set(values)).sort();
}

function buildDefaultAssetPath(outputDir: string, entryKey: string): string {
	return path.posix.join(outputDir, `${entryKey}.asset.json`);
}

type RollupDriverArtifactInputs = {
	readonly externals: readonly string[];
	readonly aliasRoot: string;
	readonly version: string;
	readonly normalizedNamespace: string;
	readonly hasUi: boolean;
	readonly entryKey: string;
	readonly entryPoint: string;
	readonly outputDir: string;
	readonly assetPath: string;
	readonly uiEntry?: AssetManifestUIEntry;
	readonly assetDependencies: string[];
};

function createUiEntry(
	normalizedNamespace: string,
	entryKey: string,
	outputDir: string,
	assetPath: string
): AssetManifestUIEntry {
	return {
		handle: toWordPressHandle(`${normalizedNamespace}-ui`),
		asset: assetPath,
		script: path.posix.join(outputDir, `${entryKey}.js`),
	};
}

function resolveNamespaceData(
	sanitizedNamespace: string | undefined,
	hasUiOption: boolean | undefined
): { normalizedNamespace: string; hasUi: boolean } {
	const normalizedNamespace = sanitizedNamespace
		? sanitizeNamespace(sanitizedNamespace)
		: '';

	return {
		normalizedNamespace,
		hasUi: hasUiOption === true && normalizedNamespace.length > 0,
	};
}

function buildOptionalUiEntry(
	hasUi: boolean,
	normalizedNamespace: string,
	entryKey: string,
	outputDir: string,
	assetPath: string
): AssetManifestUIEntry | undefined {
	if (!hasUi) {
		return undefined;
	}

	return createUiEntry(normalizedNamespace, entryKey, outputDir, assetPath);
}

function resolveRollupDriverInputs(
	pkg: PackageJsonLike | null,
	options: {
		readonly aliasRoot?: string;
		readonly sanitizedNamespace?: string;
		readonly hasUi?: boolean;
		readonly entryPoint?: string;
		readonly entryKey?: string;
		readonly outputDir?: string;
		readonly assetPath?: string;
		readonly version?: string;
	}
): RollupDriverArtifactInputs {
	const externals = buildExternalList(pkg);
	const aliasRoot = (options.aliasRoot ?? DEFAULT_ALIAS_ROOT).replace(
		/\\/g,
		'/'
	);
	const version = options.version ?? pkg?.version ?? '0.0.0';
	const { normalizedNamespace, hasUi } = resolveNamespaceData(
		options.sanitizedNamespace,
		options.hasUi
	);
	const entryKey = options.entryKey ?? DEFAULT_ENTRY_KEY;
	const outputDir = options.outputDir ?? DEFAULT_OUTPUT_DIR;
	const entryPoint = options.entryPoint ?? DEFAULT_ENTRY_POINT;
	const assetPath =
		options.assetPath ?? buildDefaultAssetPath(outputDir, entryKey);
	const uiEntry = buildOptionalUiEntry(
		hasUi,
		normalizedNamespace,
		entryKey,
		outputDir,
		assetPath
	);
	const assetDependencies = buildAssetDependencies(externals);

	return {
		externals,
		aliasRoot,
		version,
		normalizedNamespace,
		hasUi,
		entryKey,
		entryPoint,
		outputDir,
		assetPath,
		uiEntry,
		assetDependencies,
	};
}

function buildRollupDriverConfig(
	inputs: RollupDriverArtifactInputs
): RollupDriverConfig {
	return {
		driver: 'rollup',
		input: { [inputs.entryKey]: inputs.entryPoint },
		outputDir: inputs.outputDir,
		format: 'esm',
		external: inputs.externals,
		globals: buildGlobalsMap(inputs.externals),
		alias: [
			{
				find: '@/',
				replacement: normaliseAliasReplacement(inputs.aliasRoot),
			},
		],
		sourcemap: {
			development: true,
			production: false,
		},
		optimizeDeps: {
			exclude: inputs.externals,
		},
		assetManifest: {
			path: inputs.assetPath,
		},
	};
}

function buildRollupDriverAssetManifest(
	inputs: RollupDriverArtifactInputs
): AssetManifest {
	return {
		entry: inputs.entryKey,
		dependencies: inputs.assetDependencies,
		version: inputs.version,
		...(inputs.uiEntry ? { ui: inputs.uiEntry } : {}),
	};
}

function mergeSection(
	existing: Record<string, string> | undefined,
	required: Record<string, string>
): { merged: Record<string, string>; changed: boolean } {
	const merged = { ...(existing ?? {}) };
	let changed = false;

	for (const [name, version] of Object.entries(required)) {
		if (merged[name]) {
			continue;
		}

		merged[name] = version;
		changed = true;
	}

	return { merged, changed };
}

function scrubMonorepoDeps(
	deps: Record<string, string>
): Record<string, string> {
	const cleaned: Record<string, string> = {};
	for (const [key, value] of Object.entries(deps)) {
		if (MONOREPO_DEP_DENYLIST.has(key)) {
			continue;
		}
		cleaned[key] = value;
	}
	return cleaned;
}

function mergePackageJsonDependencies(options: {
	readonly pkg: PackageJsonLike | null;
	readonly resolved: DependencyResolution;
	readonly namespace: string;
	readonly version: string;
}): { pkg: PackageJsonLike; changed: boolean } {
	const base =
		options.pkg ??
		({
			name: options.namespace || 'wpk-plugin',
			version: options.version || '0.0.0',
			private: true,
			type: 'module',
			dependencies: {},
			devDependencies: {},
			peerDependencies: {},
			scripts: DEFAULT_PACKAGE_SCRIPTS,
		} satisfies PackageJsonLike);

	const previousScripts = base.scripts ?? {};
	const scripts = { ...DEFAULT_PACKAGE_SCRIPTS, ...previousScripts };
	const next = { ...base, scripts };
	let changed = !options.pkg;

	const deps = mergeSection(
		base.dependencies,
		scrubMonorepoDeps(options.resolved.dependencies)
	);
	const peerDeps = mergeSection(
		base.peerDependencies,
		scrubMonorepoDeps(options.resolved.peerDependencies)
	);
	const devDeps = mergeSection(
		base.devDependencies,
		scrubMonorepoDeps(options.resolved.devDependencies)
	);

	if (deps.changed || peerDeps.changed || devDeps.changed) {
		changed = true;
	}

	next.dependencies = deps.merged;
	next.peerDependencies = peerDeps.merged;
	next.devDependencies = devDeps.merged;

	return { pkg: next, changed };
}

function resolveUiEntryPoint(
	ir: IRv1 | null | undefined,
	hasUiResources?: boolean
): string {
	if (hasUiResources === false) {
		return DEFAULT_ENTRY_POINT;
	}

	if (!ir?.layout) {
		return DEFAULT_ENTRY_POINT;
	}

	try {
		const uiGenerated = ir.layout.resolve('ui.generated');
		return path.posix.join(uiGenerated, 'index.tsx');
	} catch {
		return DEFAULT_ENTRY_POINT;
	}
}

function toRelativeImport(from: string, target: string): string {
	const relative = path.posix
		.relative(path.posix.dirname(from), target)
		.replace(/\\/g, '/');
	if (relative.startsWith('./') || relative.startsWith('../')) {
		return relative;
	}

	return `./${relative}`;
}

function buildViteConfigSource(options: {
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
		'export default defineConfig((): UserConfig => ({',
		'  plugins: [',
		'    v4wp({',
		'      input: bundlerConfig.input,',
		'      outDir: bundlerConfig.outputDir,',
		'    }),',
		'  ],',
		'  build: {',
		'    sourcemap: bundlerConfig.sourcemap?.development ?? true,',
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

/**
 * Converts a dependency slug into the matching `wp.foo` global name.
 *
 * @param    slug
 * @category AST Builders
 */
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

/**
 * Converts a slug into a WordPress script handle format.
 *
 * For example, `my-plugin-script` becomes `wp-my-plugin-script`.
 *
 * @category AST Builders
 * @param    slug - The slug to convert.
 * @returns The WordPress script handle.
 */
export function toWordPressHandle(slug: string): string {
	return `wp-${slug}`;
}

/**
 * Builds a list of external dependencies from a package.json-like object.
 *
 * This function combines peer dependencies, regular dependencies, and a predefined
 * list of WordPress and React externals to create a comprehensive list of external
 * modules that should not be bundled.
 *
 * @category AST Builders
 * @param    pkg - A package.json-like object containing dependency information.
 * @returns An array of unique, sorted external dependency names.
 */
export function buildExternalList(pkg: PackageJsonLike | null): string[] {
	const isWordPressModule = (dependency: string): boolean =>
		dependency.startsWith('@wordpress/');

	const peerDeps = Object.keys(pkg?.peerDependencies ?? {}).filter(
		isWordPressModule
	);
	const deps = Object.keys(pkg?.dependencies ?? {}).filter(isWordPressModule);

	return sortUnique([
		...peerDeps,
		...deps,
		...DEFAULT_WORDPRESS_EXTERNALS,
		...REACT_EXTERNALS,
	]);
}

/**
 * Maps external module IDs to the globals Rollup should reference.
 *
 * @category AST Builders
 * @param    externals - The list of externalized package names.
 * @returns Record of module ID → global expression.
 */
export function buildGlobalsMap(
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

		if (dependency === 'react-dom/client') {
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

/**
 * Builds a list of WordPress asset dependencies based on external modules.
 *
 * This function translates external JavaScript dependencies (especially WordPress and React)
 * into their corresponding WordPress script handles, which are used for enqueueing assets.
 *
 * @category AST Builders
 * @param    externals - A list of external module names.
 * @returns An array of unique, sorted WordPress asset handles.
 */
export function buildAssetDependencies(externals: readonly string[]): string[] {
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
			continue;
		}
	}

	return Array.from(dependencies).sort();
}

/**
 * Ensures an alias replacement path ends with a trailing slash.
 *
 * This is important for consistent path resolution in bundlers.
 *
 * @category AST Builders
 * @param    replacement - The alias replacement path.
 * @returns The normalized alias replacement path with a trailing slash.
 */
export function normaliseAliasReplacement(replacement: string): string {
	if (replacement.endsWith('/')) {
		return replacement;
	}

	return `${replacement}/`;
}

/**
 * Builds the Rollup driver configuration and asset manifest artifacts.
 *
 * This function orchestrates the creation of the necessary configuration objects
 * for the Rollup bundler, including external dependencies, global mappings, and
 * the asset manifest used by WordPress.
 *
 * @category AST Builders
 * @param    pkg                        - A package.json-like object for dependency information.
 * @param    options                    - Additional options for building the artifacts.
 * @param    options.sanitizedNamespace
 * @param    options.hasUi
 * @param    options.entryPoint
 * @param    options.entryKey
 * @param    options.outputDir
 * @param    options.assetPath
 * @param    options.version
 * @param    options.aliasRoot          - The root path for alias replacements, defaults to './src'.
 * @returns An object containing the `RollupDriverConfig` and `AssetManifest`.
 */
export function buildRollupDriverArtifacts(
	pkg: PackageJsonLike | null,
	options: {
		readonly aliasRoot?: string;
		readonly sanitizedNamespace?: string;
		readonly hasUi?: boolean;
		readonly entryPoint?: string;
		readonly entryKey?: string;
		readonly outputDir?: string;
		readonly assetPath?: string;
		readonly version?: string;
	} = {}
): RollupDriverArtifacts {
	const inputs = resolveRollupDriverInputs(pkg, options);
	const config = buildRollupDriverConfig(inputs);
	const assetManifest = buildRollupDriverAssetManifest(inputs);

	return { config, assetManifest };
}

async function readPackageJson(
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

async function queueManifestWrites(
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

interface EnsureBundlerDependenciesArgs {
	readonly workspaceRoot: string;
	readonly pkg: PackageJsonLike | null;
	readonly hasUiResources: boolean;
	readonly namespace: string;
	readonly version: string;
}

async function ensureBundlerDependencies(
	args: EnsureBundlerDependenciesArgs
): Promise<{ pkg: PackageJsonLike | null; changed: boolean }> {
	if (!args.hasUiResources) {
		return { pkg: args.pkg, changed: false };
	}

	const resolved = await resolveDependencyVersions(args.workspaceRoot);
	return mergePackageJsonDependencies({
		pkg: args.pkg,
		resolved,
		namespace: args.namespace,
		version: args.version,
	});
}

async function runBundlerGeneration({
	context,
	input,
	output,
	reporter,
}: BuilderApplyOptions): Promise<void> {
	const pkg = await readPackageJson(context.workspace);
	const sanitizedNamespace = resolveBundlerNamespace(input);
	const version = resolveBundlerVersion(input, pkg);
	const hasUiResources = hasBundlerDataViews(input);
	const entryPoint = resolveUiEntryPoint(input.ir, hasUiResources);
	const packageResult = await ensureBundlerDependencies({
		workspaceRoot: context.workspace.root,
		pkg,
		hasUiResources,
		namespace: input.options.config.namespace,
		version,
	});

	const artifacts = buildRollupDriverArtifacts(packageResult.pkg, {
		aliasRoot: context.workspace.resolve('src'),
		sanitizedNamespace,
		hasUi: hasUiResources,
		entryPoint,
		version,
	});
	const paths = resolveBundlerPaths(input.ir);

	await persistBundlerArtifacts({
		context,
		output,
		reporter,
		artifacts,
		paths,
		packageResult,
	});
}

interface PersistBundlerArtifactsArgs {
	readonly context: PipelineContext;
	readonly output: BuilderOutput;
	readonly reporter: BuilderApplyOptions['reporter'];
	readonly artifacts: RollupDriverArtifacts;
	readonly paths: ReturnType<typeof resolveBundlerPaths>;
	readonly packageResult: {
		readonly pkg: PackageJsonLike | null;
		readonly changed: boolean;
	};
}

async function persistBundlerArtifacts(
	args: PersistBundlerArtifactsArgs
): Promise<void> {
	const { context, output, reporter, artifacts, paths, packageResult } = args;

	await context.workspace.writeJson(paths.config, artifacts.config, {
		pretty: true,
	});
	await context.workspace.writeJson(paths.assets, artifacts.assetManifest, {
		pretty: true,
	});

	if (packageResult.changed && packageResult.pkg) {
		await context.workspace.writeJson('package.json', packageResult.pkg, {
			pretty: true,
		});
	}

	const viteConfigSource = buildViteConfigSource({
		bundlerConfigPath: paths.config,
		driverConfig: artifacts.config,
	});
	await context.workspace.write(VITE_CONFIG_FILENAME, viteConfigSource, {
		ensureDir: true,
	});

	const manifest = await context.workspace.commit(BUNDLER_TRANSACTION_LABEL);
	await queueManifestWrites(context, output, manifest.writes);

	reporter.debug('Bundler configuration generated.', {
		files: manifest.writes,
	});
}

function resolveBundlerNamespace(input: BuilderInput): string {
	return (
		input.ir?.meta?.sanitizedNamespace ??
		input.options.config.namespace ??
		''
	);
}

function resolveBundlerVersion(
	input: BuilderInput,
	pkg: PackageJsonLike | null
): string {
	return input.ir?.meta?.plugin.version ?? pkg?.version ?? '0.0.0';
}

function hasBundlerDataViews(input: BuilderInput): boolean {
	return (input.ir?.resources ?? []).some((resource: IRResource) =>
		Boolean(resource.ui?.admin?.dataviews)
	);
}

/**
 * Creates a builder helper for generating bundler configuration and asset manifests.
 *
 * This helper is responsible for analyzing the project's `package.json`,
 * determining external dependencies, and generating the necessary configuration
 * files for a JavaScript bundler (currently Rollup) and a WordPress asset manifest.
 *
 * @category AST Builders
 * @returns A `BuilderHelper` instance configured to generate bundler artifacts.
 */
export function createBundler(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.bundler.core',
		kind: 'builder',
		async apply({ context, input, output, reporter }: BuilderApplyOptions) {
			if (input.phase !== 'generate') {
				reporter.debug(
					'createBundler: skipping phase without bundler support.',
					{ phase: input.phase }
				);
				return;
			}

			context.workspace.begin(BUNDLER_TRANSACTION_LABEL);

			try {
				await runBundlerGeneration({
					context,
					input,
					output,
					reporter,
				});
			} catch (error) {
				await context.workspace.rollback(BUNDLER_TRANSACTION_LABEL);
				throw error;
			}
		},
	});
}
