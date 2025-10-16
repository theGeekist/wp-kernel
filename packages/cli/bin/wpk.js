#!/usr/bin/env node

/**
 * WP Kernel CLI
 *
 * Main executable entry point
 */

const distInitModule = new URL('../dist/commands/init.js', import.meta.url);
const distRunModule = new URL('../dist/cli/run.js', import.meta.url);
const sourceInitModule = new URL('../src/commands/init.ts', import.meta.url);
const sourceRunModule = new URL('../src/cli/run.ts', import.meta.url);
const forceSource = process.env.WPK_CLI_FORCE_SOURCE === '1';

let initModuleUrl = distInitModule;
const runModule = await loadCliModule();

globalThis.__WPK_CLI_MODULE_URL__ = initModuleUrl.href;

try {
	const { runCli } = runModule;
	await runCli(process.argv.slice(2));
} catch (error) {
	console.error('[wpk] fatal', error);
	process.exitCode = 1;
}

async function loadCliModule() {
	if (!forceSource) {
		globalThis.__WPK_CLI_MODULE_URL__ = distInitModule.href;

		try {
			return await import(distRunModule.href);
		} catch (error) {
			if (!isMissingModuleError(error, distRunModule)) {
				throw error;
			}
		}
	}

	initModuleUrl = sourceInitModule;
	globalThis.__WPK_CLI_MODULE_URL__ = sourceInitModule.href;

	try {
		const { tsImport } = await import('tsx/esm/api');
		return await tsImport(sourceRunModule.href, import.meta.url);
	} catch (innerError) {
		if (isMissingSpecifier(innerError, 'tsx/esm/api')) {
			throw new Error(
				'The "tsx" peer dependency is required to run the WP Kernel CLI from source. ' +
					'Install it (e.g. "pnpm add -D tsx") or build the CLI with ' +
					'"pnpm --filter @wpkernel/cli build" before running wpk.'
			);
		}

		throw innerError;
	}
}

function isMissingModuleError(error, expectedUrl) {
	if (!error || typeof error !== 'object') {
		return false;
	}

	if ('code' in error && error.code === 'ERR_MODULE_NOT_FOUND') {
		if ('url' in error && error.url === expectedUrl.href) {
			return true;
		}

		if (typeof error.message === 'string') {
			return (
				error.message.includes(expectedUrl.href) ||
				error.message.includes(expectedUrl.pathname)
			);
		}
	}

	return false;
}

function isMissingSpecifier(error, specifier) {
	if (!error || typeof error !== 'object') {
		return false;
	}

	if (
		'code' in error &&
		error.code === 'ERR_MODULE_NOT_FOUND' &&
		typeof error.message === 'string'
	) {
		return error.message.includes(specifier);
	}

	return false;
}
