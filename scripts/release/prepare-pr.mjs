#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

function assert(condition, message) {
	if (!condition) {
		console.error(message);
		process.exit(1);
	}
}

function runCommand(command, args, cwd) {
	const result = spawnSync(command, [...args], {
		cwd,
		stdio: 'inherit',
	});

	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

function readGit(commandArgs, cwd) {
	const result = spawnSync('git', [...commandArgs], {
		cwd,
		stdio: ['ignore', 'pipe', 'inherit'],
		encoding: 'utf8',
	});

	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}

	return result.stdout.trim();
}

function ensureCleanWorkingTree(repoRoot) {
	const status = readGit(['status', '--porcelain'], repoRoot);
	assert(
		status.length === 0,
		'Working tree must be clean before preparing the release PR.'
	);
}

function printDiffSummary(repoRoot) {
	console.log('\nWorking tree summary:');
	const shortStatus = readGit(['status', '--short'], repoRoot);
	if (shortStatus.length === 0) {
		console.log(' - No changes detected.');
	} else {
		console.log(shortStatus);
	}

	const diffStat = readGit(['diff', '--stat'], repoRoot);
	if (diffStat.length > 0) {
		console.log('\nDiff stat:');
		console.log(diffStat);
	}
}

function main() {
	const currentFilePath = fileURLToPath(import.meta.url);
	const repoRoot = path.resolve(path.dirname(currentFilePath), '..', '..');

	ensureCleanWorkingTree(repoRoot);

	runCommand('pnpm', ['build'], repoRoot);
	runCommand('pnpm', ['docs:build'], repoRoot);
	printDiffSummary(repoRoot);
	console.log(
		'\nReview the diff above to confirm only generated artifacts and release metadata changed.'
	);
}

main();
