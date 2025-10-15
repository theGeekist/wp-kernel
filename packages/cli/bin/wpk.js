#!/usr/bin/env node

/**
 * WP Kernel CLI
 *
 * Main executable entry point
 */

const initModuleUrl = new URL('../dist/commands/init.js', import.meta.url).href;
globalThis.__WPK_CLI_MODULE_URL__ = initModuleUrl;

try {
	const { runCli } = await import('../dist/cli/run.js');
	await runCli(process.argv.slice(2));
} catch (error) {
	console.error('[wpk] fatal', error);
	process.exitCode = 1;
}
