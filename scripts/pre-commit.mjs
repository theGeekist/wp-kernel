#!/usr/bin/env node
import path from 'node:path';
import {
	getStagedFiles,
	isDocumentationFile,
	runTasks,
	createCommandTask,
	runCommand,
	CommandError,
	colors,
	loadWorkspaceGraph,
	resolveAffectedFromFiles,
	createConcurrentTask,
} from './precommit-utils.mjs';

const CLI_PKG = '@wpkernel/cli';

const REPO_WIDE_PATTERNS = [
	/^pnpm-workspace\.yaml$/,
	/^package\.json$/,
	/^tsconfig\./,
	/^scripts\/workspace-graph\.json$/,
	/^scripts\/.*\.m?js$/,
	/^\.github\//,
];

const TS_TEST_DENY = new Set([
	'@wpkernel/test-utils',
	'@wpkernel/e2e-utils',
]);

function isRepoWide(files) {
	return files.some((f) => REPO_WIDE_PATTERNS.some((re) => re.test(f)));
}

function filterOutDenied(workspaces) {
	return workspaces.filter((ws) => !TS_TEST_DENY.has(ws.name));
}

async function main() {
	const stagedFiles = await getStagedFiles();
	const hasStagedFiles = stagedFiles.length > 0;

	const nonDocs = stagedFiles.filter((file) => !isDocumentationFile(file));
	const hasNonDocChanges = nonDocs.length > 0;
	const docsOnly = hasStagedFiles && !hasNonDocChanges;
	const repoWide = hasNonDocChanges && isRepoWide(nonDocs);

	/** @type {import('./precommit-utils.mjs').Task[]} */
	const tasks = [];

	// 1. lint-staged
	tasks.push({
		title: 'Lint staged files',
		enabled: hasStagedFiles && !docsOnly,
		skipMessage: hasStagedFiles
			? 'Documentation-only changes detected – skipping lint-staged.'
			: 'No staged files detected – skipping lint-staged.',
		async run(ctx) {
			ctx.update('pnpm lint-staged');
			const result = await runCommand('pnpm', ['lint-staged']);
			if (result.code !== 0) {
				throw new CommandError('pnpm lint-staged', result);
			}
			const lines = [];
			const trimmed = result.stdout.trim();
			if (trimmed) {
				lines.push(...trimmed.split('\n').slice(-5));
			}
			return { summaryLines: lines };
		},
	});

	if (hasNonDocChanges) {
		if (repoWide) {
			// 🔴 THIS is the change: run BOTH in parallel so we fail fast
			tasks.push(
				createConcurrentTask({
					title: 'Typechecks (repo-wide)',
					commands: [
						{ cmd: 'pnpm', args: ['typecheck'], label: 'pnpm typecheck' },
						{ cmd: 'pnpm', args: ['typecheck:tests'], label: 'pnpm typecheck:tests' },
					],
					summaryLines: [
						'• repo-wide change detected → running pnpm typecheck + pnpm typecheck:tests together',
					],
				}),
			);
		} else {
			// smart/affected path
			const graph = await loadWorkspaceGraph();
			const { affected } = resolveAffectedFromFiles(nonDocs, graph);
			const targets = filterOutDenied(affected.length > 0 ? affected : []);

			if (targets.length > 0) {
				// run BOTH per-target in one concurrent task – still fail fast
				tasks.push(
					createConcurrentTask({
						title: 'Typechecks (affected)',
						commands: targets.flatMap((ws) => [
							{
								cmd: 'pnpm',
								args: ['--filter', ws.name, 'run', 'typecheck'],
								label: `${ws.name}`,
								cwd: process.cwd(),
							},
							{
								cmd: 'pnpm',
								args: ['--filter', ws.name, 'run', 'typecheck:tests'],
								label: `${ws.name} (tests)`,
								cwd: process.cwd(),
							},
						]),
						summaryLines: targets.flatMap((ws) =>
							ws.reasons.map((r) => `• ${ws.name}: ${r}`),
						),
					}),
				);
			} else {
				// nothing matched → root fallback, also parallel
				tasks.push(
					createConcurrentTask({
						title: 'Typechecks (fallback)',
						commands: [
							{ cmd: 'pnpm', args: ['typecheck'], label: 'pnpm typecheck' },
							{ cmd: 'pnpm', args: ['typecheck:tests'], label: 'pnpm typecheck:tests' },
						],
						summaryLines: ['• No affected packages detected – ran root typechecks'],
					}),
				);
			}
		}

		// CLI runtime tests stay as-is
		tasks.push(
			createConcurrentTask({
				title: 'Run CLI tests (coverage + integration)',
				commands: [
					{
						cmd: 'pnpm',
						args: ['--filter', CLI_PKG, 'test:coverage'],
						label: 'cli: coverage',
						cwd: process.cwd(),
					},
					{
						cmd: 'pnpm',
						args: ['--filter', CLI_PKG, 'test:integration'],
						label: 'cli: integration',
						cwd: process.cwd(),
					},
				],
				summaryLines: [
					`• runtime tests restricted to ${CLI_PKG}`,
				],
			}),
		);
	} else {
		// docs-only
		tasks.push({
			title: 'Typecheck',
			enabled: false,
			skipMessage:
				'Documentation-only changes detected – skipping typechecks.',
			async run() { },
		});
		tasks.push({
			title: 'Run tests',
			enabled: false,
			skipMessage:
				'Documentation-only changes detected – skipping tests.',
			async run() { },
		});
	}

	// format
	tasks.push(
		createCommandTask({
			title: 'Format workspace',
			commands: [{ cmd: 'pnpm', args: ['format'], label: 'pnpm format' }],
		}),
	);

	// restage
	tasks.push({
		title: 'Finalize staged changes',
		async run(ctx) {
			ctx.update('git add --update');
			const result = await runCommand('git', ['add', '--update']);
			if (result.code !== 0) {
				throw new CommandError('git add --update', result);
			}
		},
	});

	await runTasks(tasks);
}

main().catch((err) => {
	console.error(colors.red('pre-commit failed'));
	if (err && err.stack) {
		console.error(err.stack);
	}
	process.exitCode = 1;
});