import path from 'node:path';
import { promises as fs } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { cosmiconfig, defaultLoaders } from 'cosmiconfig';
import { createReporter, KernelError, type Reporter } from '@geekist/wp-kernel';
import {
	WPK_CONFIG_SOURCES,
	WPK_NAMESPACE,
} from '@geekist/wp-kernel/namespace/constants';
import type { WPKConfigSource } from '@geekist/wp-kernel/namespace/constants';
import { validateKernelConfig } from './validate-kernel-config';
import type { LoadedKernelConfig } from './types';

type CosmiconfigResult = Awaited<
	ReturnType<ReturnType<typeof cosmiconfig>['search']>
>;
type TsImport = (
	path: string,
	parent?: string | { parentURL: string }
) => Promise<unknown>;

let cachedTsImport: Promise<TsImport> | null = null;

const reporter = createReporter({
	namespace: `${WPK_NAMESPACE}.cli.config-loader`,
	level: 'info',
	enabled: process.env.NODE_ENV !== 'test',
});

export async function loadKernelConfig(): Promise<LoadedKernelConfig> {
	const explorer = cosmiconfig('wpk', {
		searchPlaces: [
			WPK_CONFIG_SOURCES.KERNEL_CONFIG_TS,
			WPK_CONFIG_SOURCES.KERNEL_CONFIG_JS,
			'package.json',
		],
		packageProp: 'wpk',
		loaders: {
			...defaultLoaders,
			'.ts': createTsLoader(),
			'.js': createJsLoader(),
			'.mjs': createJsLoader(),
			'.cjs': createJsLoader(),
		},
	});

	const searchResult = await explorer.search();
	if (!searchResult || searchResult.isEmpty) {
		const message =
			'Unable to locate a kernel config. Create kernel.config.ts (or kernel.config.js) or add a "wpk" field to package.json.';
		reporter.error(message);
		throw new KernelError('DeveloperError', { message });
	}

	const resolvedResult = searchResult as NonNullable<CosmiconfigResult>;

	const origin = getConfigOrigin(resolvedResult);
	const sourcePath = resolvedResult.filepath;

	reporter.debug('Kernel config candidate discovered.', {
		origin,
		sourcePath,
	});

	const rawConfig = await resolveConfigValue(resolvedResult.config);
	const { config, namespace } = validateKernelConfig(rawConfig, {
		reporter,
		sourcePath,
		origin,
	});

	const composerCheck = await validateComposerAutoload(
		path.dirname(sourcePath),
		namespace,
		reporter.child('composer')
	);

	reporter.info('Kernel config loaded successfully.', {
		origin,
		namespace,
		sourcePath,
	});

	return {
		config,
		sourcePath,
		configOrigin: origin,
		composerCheck,
		namespace,
	};
}

function getConfigOrigin(
	result: NonNullable<CosmiconfigResult>
): WPKConfigSource {
	const fileName = path.basename(result.filepath);

	if (fileName === WPK_CONFIG_SOURCES.KERNEL_CONFIG_TS) {
		return WPK_CONFIG_SOURCES.KERNEL_CONFIG_TS;
	}

	if (fileName === WPK_CONFIG_SOURCES.KERNEL_CONFIG_JS) {
		return WPK_CONFIG_SOURCES.KERNEL_CONFIG_JS;
	}

	if (fileName === 'package.json') {
		return WPK_CONFIG_SOURCES.PACKAGE_JSON_WPK;
	}

	const message = `Unsupported kernel config source: ${fileName}.`;
	reporter.error(message, { fileName, filepath: result.filepath });
	throw new KernelError('DeveloperError', { message });
}

function createTsLoader() {
	const defaultTsLoader = defaultLoaders['.ts'];

	return async (filepath: string, content: string) => {
		try {
			return await defaultTsLoader(filepath, content);
		} catch (_defaultError) {
			try {
				const tsImport = await getTsImport();
				const absPath = path.resolve(filepath);
				const moduleExports = await tsImport(absPath, {
					parentURL: pathToFileURL(absPath).href,
				});
				return resolveConfigValue(moduleExports);
			} catch (tsxError) {
				const message = `Failed to execute ${filepath}: ${formatError(tsxError)}`;
				reporter.error(message, { filepath, error: tsxError });
				const underlying =
					tsxError instanceof Error ? tsxError : undefined;
				throw new KernelError('DeveloperError', {
					message,
					data: underlying
						? { originalError: underlying }
						: undefined,
				});
			}
		}
	};
}

function createJsLoader() {
	return async (filepath: string) => {
		try {
			const moduleExports = await import(pathToFileURL(filepath).href);
			return resolveConfigValue(moduleExports);
		} catch (error) {
			const message = `Failed to import ${filepath}: ${formatError(error)}`;
			const underlying = error instanceof Error ? error : undefined;
			throw new KernelError('DeveloperError', {
				message,
				data: underlying ? { originalError: underlying } : undefined,
			});
		}
	};
}

async function resolveConfigValue(value: unknown): Promise<unknown> {
	let current = value;

	while (isPromise(current)) {
		current = await current;
	}

	while (isObject(current)) {
		if ('default' in current && current.default !== current) {
			current = current.default;
			continue;
		}

		if ('kernelConfig' in current && current.kernelConfig !== current) {
			current = current.kernelConfig;
			continue;
		}

		if ('config' in current && current.config !== current) {
			current = current.config;
			continue;
		}

		break;
	}

	return current;
}

async function validateComposerAutoload(
	startDir: string,
	namespace: string,
	validationReporter: Reporter
): Promise<'ok'> {
	const composerPath = await findUp(startDir, 'composer.json');
	if (!composerPath) {
		const message = `composer.json not found near ${startDir}. Ensure your plugin declares psr-4 autoload mapping to "inc/".`;
		validationReporter.error(message, { startDir });
		throw new KernelError('ValidationError', {
			message,
			context: {
				startDir,
				namespace,
			},
		});
	}

	const composerJson = await readComposerJson(
		composerPath,
		validationReporter
	);
	const autoload = getComposerAutoloadMap(
		composerJson,
		composerPath,
		validationReporter
	);
	assertIncMapping(autoload, composerPath, validationReporter);

	validationReporter.debug('Composer autoload verified for namespace.', {
		composerPath,
		namespace,
	});

	return 'ok';
}

async function readComposerJson(
	composerPath: string,
	validationReporter: Reporter
): Promise<unknown> {
	try {
		const composerRaw = await fs.readFile(composerPath, 'utf8');
		return JSON.parse(composerRaw);
	} catch (error) {
		const message = `Unable to read composer.json at ${composerPath}: ${formatError(error)}`;
		validationReporter.error(message, { composerPath });
		const underlying = error instanceof Error ? error : undefined;
		throw new KernelError('ValidationError', {
			message,
			context: { composerPath },
			data: underlying ? { originalError: underlying } : undefined,
		});
	}
}

function getComposerAutoloadMap(
	composerJson: unknown,
	composerPath: string,
	validationReporter: Reporter
): Record<string, unknown> {
	if (
		!isObject(composerJson) ||
		!isObject((composerJson as Record<string, unknown>).autoload)
	) {
		const message = `composer.json at ${composerPath} is missing an "autoload" object.`;
		validationReporter.error(message, { composerPath });
		throw new KernelError('ValidationError', {
			message,
			context: { composerPath },
		});
	}

	const autoload = (composerJson as { autoload: Record<string, unknown> })
		.autoload['psr-4'];
	if (!isObject(autoload)) {
		const message = `composer.json at ${composerPath} must declare "autoload.psr-4".`;
		validationReporter.error(message, { composerPath });
		throw new KernelError('ValidationError', {
			message,
			context: { composerPath },
		});
	}

	return autoload;
}

function assertIncMapping(
	autoload: Record<string, unknown>,
	composerPath: string,
	validationReporter: Reporter
): void {
	const hasIncMapping = Object.values(autoload).some((mapping) => {
		if (typeof mapping !== 'string') {
			return false;
		}

		const normalized = mapping.endsWith('/') ? mapping : `${mapping}/`;
		return normalized === 'inc/';
	});

	if (hasIncMapping) {
		return;
	}

	const message = `composer.json at ${composerPath} must map at least one PSR-4 namespace to "inc/" to match generated PHP output.`;
	validationReporter.error(message, {
		composerPath,
		autoload,
	});
	throw new KernelError('ValidationError', {
		message,
		context: { composerPath },
	});
}

async function findUp(
	startDir: string,
	fileName: string
): Promise<string | null> {
	const current = path.resolve(startDir);
	const candidate = path.join(current, fileName);

	if (await fileExists(candidate)) {
		return candidate;
	}

	const parent = path.dirname(current);
	if (parent === current) {
		return null;
	}

	return findUp(parent, fileName);
}

async function fileExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isPromise(value: unknown): value is Promise<unknown> {
	return (
		isObject(value) &&
		typeof (value as { then?: unknown }).then === 'function'
	);
}

async function getTsImport(): Promise<TsImport> {
	if (!cachedTsImport) {
		cachedTsImport = import('tsx/esm/api').then(
			(mod) => mod.tsImport as TsImport
		);
	}

	return cachedTsImport;
}

function formatError(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}

	return String(error);
}
