#!/usr/bin/env node

/**
 * WP Kernel CLI
 *
 * Main executable entry point
 */

import { runCli } from '../dist/cli/run.js';

try {
	await runCli(process.argv.slice(2));
} catch (error) {
	console.error('[wpk] fatal', error);
	process.exitCode = 1;
}
