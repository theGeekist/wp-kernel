#!/usr/bin/env node

/**
 * WP Kernel CLI
 *
 * Main executable entry point
 */

globalThis.__WPK_CLI_MODULE_URL__ = import.meta.url;

try {
	const { runCli } = await import('../dist/cli/run.js');
	await runCli(process.argv.slice(2));
} catch (error) {
	console.error('[wpk] fatal', error);
	process.exitCode = 1;
}
