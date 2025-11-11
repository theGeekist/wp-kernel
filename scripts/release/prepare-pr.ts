#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) {
		console.error(message);
		process.exit(1);
	}
}

function runCommand(
	command: string,
	args: readonly string[],
	cwd: string
): void {
	const result = spawnSync(command, [...args], {
		cwd,
		stdio: 'inherit',
	});

	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

function readGit(commandArgs: readonly string[], cwd: string): string {
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

function ensureCleanWorkingTree(repoRoot: string): void {
	const status = readGit(['status', '--porcelain'], repoRoot);
	assert(
		status.length === 0,
		'Working tree must be clean before preparing the release PR.'
	);
}

function printDiffSummary(repoRoot: string): void {
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

function main(): void {
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
