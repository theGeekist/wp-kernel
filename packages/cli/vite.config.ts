import { resolve as resolvePath } from 'node:path';
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

const external = [
	...Object.keys(pkg.peerDependencies || {}),
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

	return {
		name: 'wpkernel-cli-php-driver-installer',
		apply: 'build',
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

const existingPlugins = config.plugins ?? [];

config.plugins = Array.isArray(existingPlugins)
	? [...existingPlugins, phpDriverInstallerPlugin()]
	: [existingPlugins, phpDriverInstallerPlugin()];

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
