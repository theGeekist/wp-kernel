#!/usr/bin/env node

/**
 * WPKernel CLI
 *
 * Main executable entry point.
 */

const distInitModule = new URL('../dist/commands/init.js', import.meta.url);
const distRunModule = new URL('../dist/cli/run.js', import.meta.url);

globalThis.__WPK_CLI_MODULE_URL__ = distInitModule.href;

try {
	const { runCli } = await import(distRunModule.href);
	await runCli(process.argv.slice(2));
} catch (error) {
	handleLoadFailure(error);
	process.exitCode = 1;
}

function handleLoadFailure(error) {
	if (isMissingModuleError(error)) {
		console.error(
			'[wpk] missing compiled CLI artifacts. ' +
				'Build the CLI with "pnpm --filter @wpkernel/cli build" before invoking wpk.'
		);
		if (error) {
			console.error(error);
		}
		return;
	}

	console.error('[wpk] fatal', error);
}

function isMissingModuleError(error) {
	return Boolean(
		error &&
			typeof error === 'object' &&
			'code' in error &&
			error.code === 'ERR_MODULE_NOT_FOUND'
	);
}
