import { resolve as resolvePath, dirname } from 'node:path';
import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { PluginOption } from 'vite';
import type { Reporter } from '@wpkernel/core/reporter';
import { buildWorkspace } from './src/workspace';
import { createWPKLibConfig } from '../../vite.config.base';
import pkg from './package.json';

interface DriverInstallerHelper {
	key: string;
	kind: 'builder';
	apply: (...args: readonly unknown[]) => Promise<void> | void;
}

type PhpDriverInstallerFactory = () => DriverInstallerHelper;

async function copyPhpDriverDist(outDir: string): Promise<void> {
	const driverRoot = resolvePath(CLI_ROOT, '..', 'php-driver');
	const distSource = resolvePath(driverRoot, 'dist');
	const distTarget = resolvePath(outDir, 'packages', 'php-driver', 'dist');

	await rm(distTarget, { recursive: true, force: true }).catch(
		() => undefined
	);
	await mkdir(distTarget, { recursive: true });
	await cp(distSource, distTarget, { recursive: true });

	const phpSource = resolvePath(driverRoot, 'php');
	await copyDirectoryIfExists(
		phpSource,
		resolvePath(outDir, 'packages', 'php-driver', 'php')
	);
	await copyDirectoryIfExists(
		phpSource,
		resolvePath(outDir, 'packages', 'php-driver', 'dist', 'php')
	);

	const vendorSource = resolvePath(driverRoot, 'vendor');
	await copyDirectoryIfExists(
		vendorSource,
		resolvePath(outDir, 'packages', 'php-driver', 'vendor')
	);
	await copyDirectoryIfExists(
		vendorSource,
		resolvePath(outDir, 'packages', 'php-driver', 'dist', 'vendor')
	);

	const fileEntries = ['composer.json', 'composer.lock', 'package.json'];
	for (const file of fileEntries) {
		await copyFileIfExists(
			resolvePath(driverRoot, file),
			resolvePath(outDir, 'packages', 'php-driver', file)
		);
		await copyFileIfExists(
			resolvePath(driverRoot, file),
			resolvePath(outDir, 'packages', 'php-driver', 'dist', file)
		);
	}
}

async function copyPhpJsonAstAssets(outDir: string): Promise<void> {
	const packageRoot = resolvePath(CLI_ROOT, '..', 'php-json-ast');

	await copyPhpJsonAstNodeModulesAssets(
		resolvePath(outDir, 'node_modules', '@wpkernel', 'php-json-ast'),
		packageRoot
	);

	await copyPhpJsonAstPackageAssets(
		resolvePath(outDir, 'packages', 'php-json-ast'),
		packageRoot
	);
}

async function copyPhpJsonAstNodeModulesAssets(
	targetRoot: string,
	packageRoot: string
): Promise<void> {
	await rm(targetRoot, { recursive: true, force: true }).catch(
		() => undefined
	);
	await mkdir(targetRoot, { recursive: true });

	const fileEntries = ['package.json', 'composer.json', 'composer.lock'];
	const directoryEntries = ['php', 'vendor'];

	for (const file of fileEntries) {
		await copyEntry(packageRoot, targetRoot, file, { recursive: false });
	}

	for (const directory of directoryEntries) {
		await copyEntry(packageRoot, targetRoot, directory, {
			recursive: true,
		});
	}
}

async function copyPhpJsonAstPackageAssets(
	targetRoot: string,
	packageRoot: string
): Promise<void> {
	await mkdir(targetRoot, { recursive: true });

	const fileEntries = ['composer.json', 'composer.lock', 'package.json'];
	const directoryEntries = ['php', 'vendor'];

	for (const file of fileEntries) {
		const destination = resolvePath(targetRoot, file);
		await rm(destination, { recursive: true, force: true }).catch(
			() => undefined
		);
		await copyEntry(packageRoot, targetRoot, file, { recursive: false });
	}

	for (const directory of directoryEntries) {
		await copyPhpJsonAstDirectory(
			packageRoot,
			resolvePath(targetRoot, directory),
			directory
		);
		await copyPhpJsonAstDirectory(
			packageRoot,
			resolvePath(targetRoot, 'dist', directory),
			directory
		);
	}
}

async function copyPhpJsonAstDirectory(
	packageRoot: string,
	targetDirectory: string,
	entry: string
): Promise<void> {
	await rm(targetDirectory, { recursive: true, force: true }).catch(
		() => undefined
	);
	const source = resolvePath(packageRoot, entry);
	await mkdir(dirname(targetDirectory), { recursive: true });
	await cp(source, targetDirectory, { recursive: true });
}

async function copyDirectoryIfExists(
	source: string,
	target: string
): Promise<void> {
	try {
		await rm(target, { recursive: true, force: true }).catch(
			() => undefined
		);
		await mkdir(dirname(target), { recursive: true });
		await cp(source, target, { recursive: true });
	} catch (error) {
		if (isNoEntryError(error)) {
			return;
		}

		throw error;
	}
}

async function copyFileIfExists(source: string, target: string): Promise<void> {
	try {
		await mkdir(dirname(target), { recursive: true });
		await cp(source, target, { recursive: false });
	} catch (error) {
		if (isNoEntryError(error)) {
			return;
		}

		throw error;
	}
}

async function copyEntry(
	root: string,
	targetRoot: string,
	entry: string,
	options: { recursive: boolean }
): Promise<void> {
	const source = resolvePath(root, entry);
	const destination = resolvePath(targetRoot, entry);

	try {
		await mkdir(dirname(destination), { recursive: true });
		await cp(source, destination, { recursive: options.recursive });
	} catch (error) {
		if (isNoEntryError(error)) {
			return;
		}

		throw error;
	}
}

function isNoEntryError(error: unknown): error is { code?: string } {
	return (
		Boolean(error && typeof error === 'object') &&
		'code' in (error as { code?: string }) &&
		(error as { code?: string }).code === 'ENOENT'
	);
}

function resolveCliRoot(): string {
	if (typeof __dirname === 'string') {
		return __dirname;
	}

	try {
		const moduleUrl = new Function('return import.meta.url')() as string;
		return fileURLToPath(new URL('.', moduleUrl));
	} catch {
		return process.cwd();
	}
}

const CLI_ROOT = resolveCliRoot();

let cachedPhpDriverInstaller: PhpDriverInstallerFactory | null = null;

async function loadPhpDriverInstaller(): Promise<PhpDriverInstallerFactory> {
	if (!cachedPhpDriverInstaller) {
		const module = (await import('@wpkernel/php-driver')) as {
			createPhpDriverInstaller: PhpDriverInstallerFactory;
		};
		cachedPhpDriverInstaller = module.createPhpDriverInstaller;
	}

	return cachedPhpDriverInstaller;
}

const externalPeerDependencies = Object.keys(pkg.peerDependencies || {}).filter(
	(dep) => dep !== '@wpkernel/php-json-ast'
);

const external = [
	...externalPeerDependencies,
	'chokidar',
	'clipanion',
	'cosmiconfig',
	'typanion',
	'@wordpress/dataviews',
	'@wordpress/data',
	'@wordpress/components',
	'@wordpress/element',
	'typescript',
	'ts-morph',
];

function createConsoleReporter(): Reporter {
	const log = (
		level: 'info' | 'warn' | 'error' | 'debug',
		message: string,
		context?: unknown
	) => {
		switch (level) {
			case 'warn':
				if (typeof context === 'undefined') {
					console.warn(message);
				} else {
					console.warn(message, context);
				}
				break;
			case 'error':
				if (typeof context === 'undefined') {
					console.error(message);
				} else {
					console.error(message, context);
				}
				break;
			case 'debug':
				if (typeof context === 'undefined') {
					console.debug(message);
				} else {
					console.debug(message, context);
				}
				break;
			case 'info':
			default:
				if (typeof context === 'undefined') {
					console.info(message);
				} else {
					console.info(message, context);
				}
		}
	};

	const reporter: Reporter = {
		info(message, context) {
			log('info', message, context);
		},
		warn(message, context) {
			log('warn', message, context);
		},
		error(message, context) {
			log('error', message, context);
		},
		debug(message, context) {
			log('debug', message, context);
		},
		child() {
			return reporter;
		},
	};

	return reporter;
}

function phpDriverInstallerPlugin(): PluginOption {
	let hasRun = false;
	let resolvedOutDir = resolvePath(CLI_ROOT, 'dist');

	return {
		name: 'wpkernel-cli-php-driver-installer',
		apply: 'build',
		configResolved(config) {
			const root = config.root ?? CLI_ROOT;
			const dir = config.build?.outDir ?? 'dist';
			resolvedOutDir = resolvePath(root, dir);
		},
		async buildStart() {
			if (hasRun) {
				return;
			}

			hasRun = true;

			const factory = await loadPhpDriverInstaller();
			const helper = factory();
			const reporter = createConsoleReporter();
			const workspace = buildWorkspace(CLI_ROOT);

			await helper.apply(
				{
					context: {
						workspace,
						phase: 'generate' as const,
						reporter,
					},
					input: undefined as never,
					output: undefined as never,
					reporter,
				},
				undefined
			);
		},
		async writeBundle() {
			await copyPhpDriverDist(resolvedOutDir);
		},
	};
}

function phpJsonAstAssetsPlugin(): PluginOption {
	let resolvedOutDir = resolvePath(CLI_ROOT, 'dist');

	return {
		name: 'wpkernel-cli-php-json-ast-assets',
		apply: 'build',
		configResolved(config) {
			const root = config.root ?? CLI_ROOT;
			const dir = config.build?.outDir ?? 'dist';
			resolvedOutDir = resolvePath(root, dir);
		},
		async writeBundle() {
			await copyPhpJsonAstAssets(resolvedOutDir);
		},
	};
}

const config = createWPKLibConfig(
	'@wpkernel/cli',
	{
		index: 'src/index.ts',
	},
	{
		external,
	}
);

const assetPlugins = [phpDriverInstallerPlugin(), phpJsonAstAssetsPlugin()];
const existingPlugins = config.plugins;

if (Array.isArray(existingPlugins)) {
	config.plugins = [...existingPlugins, ...assetPlugins];
} else if (existingPlugins) {
	config.plugins = [existingPlugins, ...assetPlugins];
} else {
	config.plugins = assetPlugins;
}

const cliSrcRoot = resolvePath(CLI_ROOT, 'src');
const existingAlias = config.resolve?.alias;
const aliasEntries = Array.isArray(existingAlias)
	? existingAlias.slice()
	: Object.entries(existingAlias ?? {}).map(([find, replacement]) => ({
			find,
			replacement,
		}));

aliasEntries.push(
	{
		find: /^@wpkernel\/cli$/,
		replacement: resolvePath(cliSrcRoot, 'index.ts'),
	},
	{
		find: /^@wpkernel\/cli\//,
		replacement: `${cliSrcRoot}/`,
	}
);

config.resolve = {
	...(config.resolve ?? {}),
	alias: aliasEntries,
};

export default config;
