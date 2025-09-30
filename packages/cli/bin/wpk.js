#!/usr/bin/env node

/**
 * WP Kernel CLI
 *
 * Main executable entry point
 */

import { Command } from 'commander';
import { VERSION } from '../dist/index.js';

const program = new Command();

program
	.name('wpk')
	.description('CLI for scaffolding and managing WP Kernel projects')
	.version(VERSION);

// Placeholder commands - implementations coming in future sprints
program
	.command('generate <type> <name>')
	.alias('g')
	.description('Generate a new resource, action, or component')
	.option(
		'-d, --dry-run',
		'Show what would be generated without creating files'
	)
	.action((type, name, options) => {
		console.log(`[WPK] Would generate ${type}: ${name}`);
		if (options.dryRun) {
			console.log('[WPK] Dry run - no files created');
		}
	});

program
	.command('init')
	.description('Initialize a new WP Kernel project')
	.option('-n, --name <name>', 'Project name')
	.option('-t, --template <template>', 'Template to use', 'default')
	.action((options) => {
		console.log(
			`[WPK] Would initialize project: ${options.name || 'wp-kernel-project'}`
		);
		console.log(`[WPK] Template: ${options.template}`);
	});

program
	.command('doctor')
	.description('Check project setup and dependencies')
	.action(() => {
		console.log('[WPK] Checking project health...');
		console.log('[WPK] ✅ TypeScript installed');
		console.log('[WPK] ✅ Node version OK');
		console.log('[WPK] Implementation coming soon!');
	});

program.parse(process.argv);
