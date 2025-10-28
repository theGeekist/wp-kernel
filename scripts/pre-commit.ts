#!/usr/bin/env tsx

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { performance } from 'node:perf_hooks';

interface CommandResult {
	stdout: string;
	stderr: string;
	code: number;
	signal: NodeJS.Signals | null;
	durationMs: number;
}

class CommandError extends Error {
	public readonly result: CommandResult;
	public readonly command: string;

	constructor(command: string, result: CommandResult) {
		super(`Command failed: ${command}`);
		this.result = result;
		this.command = command;
	}
}

const isInteractive = process.stdout.isTTY && !process.env.CI;
const useColor = process.stdout.isTTY && process.env.NO_COLOR !== '1';

const colors = {
	green: (text: string) => (useColor ? `\u001B[32m${text}\u001B[0m` : text),
	red: (text: string) => (useColor ? `\u001B[31m${text}\u001B[0m` : text),
	yellow: (text: string) => (useColor ? `\u001B[33m${text}\u001B[0m` : text),
	cyan: (text: string) => (useColor ? `\u001B[36m${text}\u001B[0m` : text),
	dim: (text: string) => (useColor ? `\u001B[2m${text}\u001B[0m` : text),
};

const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

interface Spinner {
	update: (suffix?: string) => void;
	succeed: (message: string) => void;
	fail: (message: string) => void;
}

function createSpinner(label: string): Spinner {
	if (!isInteractive) {
		console.log(`${colors.cyan('▶')} ${label}`);
		return {
			update: (suffix?: string) => {
				if (suffix) {
					console.log(`${colors.dim('   ↳')} ${suffix}`);
				}
			},
			succeed: (message: string) => {
				console.log(`${colors.green('✔')} ${message}`);
			},
			fail: (message: string) => {
				console.error(`${colors.red('✖')} ${message}`);
			},
		};
	}

	let suffixText = '';
	let frameIndex = 0;
	let active = true;

	const tick = () => {
		if (!active) {
			return;
		}
		const frame = spinnerFrames[frameIndex];
		frameIndex = (frameIndex + 1) % spinnerFrames.length;
		const message = `${frame} ${label}${suffixText ? colors.dim(` · ${suffixText}`) : ''}`;
		process.stdout.write(`\r${message}`);
	};

	const interval = setInterval(tick, 80);
	tick();

	const clearLine = () => {
		process.stdout.write('\r');
		process.stdout.clearLine(0);
	};

	return {
		update: (suffix?: string) => {
			suffixText = suffix ?? '';
		},
		succeed: (message: string) => {
			active = false;
			clearInterval(interval);
			clearLine();
			console.log(`${colors.green('✔')} ${message}`);
		},
		fail: (message: string) => {
			active = false;
			clearInterval(interval);
			clearLine();
			console.error(`${colors.red('✖')} ${message}`);
		},
	};
}

async function runCommand(
	command: string,
	args: string[],
	options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}
): Promise<CommandResult> {
	const startedAt = performance.now();
	const child = spawn(command, args, {
		cwd: options.cwd ?? process.cwd(),
		env: { ...process.env, ...options.env },
		stdio: 'pipe',
	});

	let stdout = '';
	let stderr = '';

	child.stdout.on('data', (data) => {
		stdout += data.toString();
	});

	child.stderr.on('data', (data) => {
		stderr += data.toString();
	});

	const [code, signal] = (await once(child, 'close')) as [
		number,
		NodeJS.Signals | null,
	];
	const durationMs = performance.now() - startedAt;

	return { stdout, stderr, code, signal, durationMs };
}

function formatDuration(durationMs: number): string {
	if (durationMs < 1000) {
		return `${durationMs.toFixed(0)}ms`;
	}

	const seconds = durationMs / 1000;
	if (seconds < 60) {
		return `${seconds < 10 ? seconds.toFixed(1) : seconds.toFixed(0)}s`;
	}

	const minutes = Math.floor(seconds / 60);
	const remaining = seconds - minutes * 60;
	const secondsPart =
		remaining < 10 ? `0${remaining.toFixed(0)}` : `${remaining.toFixed(0)}`;

	return `${minutes}m ${secondsPart}s`;
}

interface TaskContext {
	update: (suffix?: string) => void;
}

interface TaskResult {
	summaryLines?: string[];
}

interface Task {
	title: string;
	run: (ctx: TaskContext) => Promise<TaskResult | void>;
	enabled?: boolean;
	skipMessage?: string;
}

async function getStagedFiles(): Promise<string[]> {
	const result = await runCommand('git', [
		'diff',
		'--cached',
		'--name-only',
		'--diff-filter=ACMR',
	]);

	if (result.code !== 0) {
		throw new CommandError(
			'git diff --cached --name-only --diff-filter=ACMR',
			result
		);
	}

	return result.stdout
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);
}

function hasPrefix(files: string[], prefix: string): boolean {
	return files.some((file) => file.startsWith(prefix));
}

function buildTypecheckTasks(stagedFiles: string[]): Task[] {
	const tasks: Task[] = [];
	const typecheckTargets = new Map<
		string,
		{ label: string; reasons: string[]; filter: string }
	>();

	const registerTarget = (
		key: string,
		label: string,
		filter: string,
		reason: string
	) => {
		const entry = typecheckTargets.get(key) ?? {
			label,
			reasons: [],
			filter,
		};
		if (!entry.reasons.includes(reason)) {
			entry.reasons.push(reason);
		}
		typecheckTargets.set(key, entry);
	};

	const hasCoreChanges = hasPrefix(stagedFiles, 'packages/core/');
	const hasUIChanges = hasPrefix(stagedFiles, 'packages/ui/');
	const hasCliChanges = hasPrefix(stagedFiles, 'packages/cli/');
	const hasPhpDriverChanges = hasPrefix(stagedFiles, 'packages/php-driver/');
	const hasPhpAstChanges = hasPrefix(stagedFiles, 'packages/php-json-ast/');
	const hasWpJsonAstChanges = hasPrefix(stagedFiles, 'packages/wp-json-ast/');
	const hasShowcaseChanges = hasPrefix(stagedFiles, 'examples/showcase/');

	if (hasCoreChanges) {
		tasks.push(
			createCommandTask({
				title: 'Typecheck entire workspace',
				commands: [
					{ cmd: 'pnpm', args: ['typecheck'], label: 'typecheck' },
					{
						cmd: 'pnpm',
						args: ['typecheck:tests'],
						label: 'typecheck:tests',
					},
				],
			})
		);
		return tasks;
	}

	if (hasUIChanges) {
		registerTarget(
			'ui',
			'UI workspace',
			'@wpkernel/ui',
			'UI files changed'
		);
		registerTarget(
			'cli',
			'CLI workspace',
			'@wpkernel/cli',
			'UI depends on CLI output'
		);
	}

	if (hasCliChanges) {
		registerTarget(
			'cli',
			'CLI workspace',
			'@wpkernel/cli',
			'CLI files changed'
		);
	}

	if (hasPhpDriverChanges) {
		registerTarget(
			'php-driver',
			'PHP driver workspace',
			'@wpkernel/php-driver',
			'PHP driver files changed'
		);
	}

	if (hasPhpAstChanges) {
		registerTarget(
			'php-json-ast',
			'PHP JSON AST workspace',
			'@wpkernel/php-json-ast',
			'PHP JSON AST files changed'
		);
	}

	if (hasWpJsonAstChanges) {
		registerTarget(
			'wp-json-ast',
			'WP JSON AST workspace',
			'@wpkernel/wp-json-ast',
			'WP JSON AST files changed'
		);
	}

	if (hasShowcaseChanges) {
		registerTarget(
			'showcase',
			'Showcase example',
			'wp-kernel-showcase',
			'Showcase files changed'
		);
	}

	for (const [, target] of typecheckTargets) {
		tasks.push(
			createCommandTask({
				title: `Typecheck ${target.label}`,
				summaryLines: target.reasons.map((reason) => `• ${reason}`),
				commands: [
					{
						cmd: 'pnpm',
						args: ['--filter', target.filter, 'typecheck'],
						label: 'typecheck',
					},
					{
						cmd: 'pnpm',
						args: ['--filter', target.filter, 'typecheck:tests'],
						label: 'typecheck:tests',
					},
				],
			})
		);
	}

	if (typecheckTargets.size === 0) {
		tasks.push({
			title: 'Typecheck',
			enabled: false,
			skipMessage: 'No package changes detected – skipping typechecks.',
			run: async () => {},
		});
	}

	return tasks;
}

interface CommandDescriptor {
	cmd: string;
	args: string[];
	label?: string;
}

function createCommandTask({
	title,
	commands,
	summaryLines,
}: {
	title: string;
	commands: CommandDescriptor[];
	summaryLines?: string[] | (() => string[]);
}): Task {
	return {
		title,
		async run(ctx) {
			for (const command of commands) {
				ctx.update(command.label);
				const result = await runCommand(command.cmd, command.args);
				if (result.code !== 0) {
					throw new CommandError(
						`${command.cmd} ${command.args.join(' ')}`,
						result
					);
				}
			}

			return {
				summaryLines:
					typeof summaryLines === 'function'
						? summaryLines()
						: summaryLines,
			} satisfies TaskResult;
		},
	};
}

async function runTasks(tasks: Task[]): Promise<void> {
	const runnableTasks: Task[] = [];

	for (const task of tasks) {
		if (isTaskEnabled(task)) {
			runnableTasks.push(task);
			continue;
		}

		logSkippedTask(task);
	}

	let index = 0;
	for (const task of runnableTasks) {
		index += 1;
		await executeTask(task, index, runnableTasks.length);
	}
}

function logSkippedTask(task: Task): void {
	if (task.skipMessage) {
		console.log(`${colors.yellow('⏭')} ${task.skipMessage}`);
	}
}

function isTaskEnabled(task: Task): boolean {
	return task.enabled !== false;
}

async function executeTask(
	task: Task,
	index: number,
	total: number
): Promise<void> {
	const label = `[${index}/${total}] ${task.title}`;
	const spinner = createSpinner(label);
	const start = performance.now();

	let result: TaskResult | void;

	try {
		result = (await task.run({
			update: (suffix?: string) => spinner.update(suffix),
		})) as TaskResult | void;
	} catch (error) {
		spinner.fail(`${label} (${formatDuration(performance.now() - start)})`);
		if (error instanceof CommandError) {
			printCommandError(error);
		} else if (error instanceof Error) {
			console.error(error.message);
		} else {
			console.error(String(error));
		}
		throw error;
	}

	const durationLabel = `${label} (${formatDuration(performance.now() - start)})`;
	spinner.succeed(durationLabel);

	if (result?.summaryLines && result.summaryLines.length > 0) {
		for (const line of result.summaryLines) {
			console.log(`   ${colors.dim('•')} ${line}`);
		}
	}
}

function printCommandError(error: CommandError): void {
	console.error(colors.red(`→ ${error.command}`));
	const stdout = error.result.stdout.trim();
	const stderr = error.result.stderr.trim();

	if (stdout.length > 0) {
		console.error(colors.dim('── stdout ──'));
		console.error(stdout);
	}

	if (stderr.length > 0) {
		console.error(colors.dim('── stderr ──'));
		console.error(stderr);
	}
}

function extractCoverageSummary(output: string): string[] {
	const lines = output
		.split(/\r?\n/)
		.map((line) => line.trimEnd())
		.filter((line) => line.length > 0);

	if (lines.length === 0) {
		return [];
	}

	const summary: string[] = [];

	const tableHeaderIndex = lines.findLastIndex((line) =>
		/^File\s+\|/.test(line)
	);
	const allFilesIndex = lines.findLastIndex((line) =>
		line.startsWith('All files')
	);

	if (tableHeaderIndex !== -1 && allFilesIndex !== -1) {
		const start = Math.max(tableHeaderIndex - 1, 0);
		const end = Math.min(allFilesIndex + 1, lines.length);
		const tableLines = lines.slice(start, Math.min(start + 4, end + 1));
		summary.push(...tableLines);
	}

	const testSummaryIndex = lines.findLastIndex((line) =>
		line.startsWith('Test Suites:')
	);
	if (testSummaryIndex !== -1) {
		summary.push(
			...lines.slice(
				testSummaryIndex,
				Math.min(testSummaryIndex + 5, lines.length)
			)
		);
	}

	return summary.length > 0 ? summary : ['Coverage summary unavailable'];
}

async function main() {
	const stagedFiles = await getStagedFiles();

	const tasks: Task[] = [];

	const hasStagedFiles = stagedFiles.length > 0;

	tasks.push({
		title: 'Format & lint staged files',
		enabled: hasStagedFiles,
		skipMessage: 'No staged files detected – skipping lint-staged.',
		async run(ctx) {
			ctx.update('lint-staged');
			const result = await runCommand('pnpm', ['lint-staged']);
			if (result.code !== 0) {
				throw new CommandError('pnpm lint-staged', result);
			}

			const summaryLines: string[] = [];
			const trimmed = result.stdout.trim();
			if (trimmed.length > 0) {
				const lines = trimmed.split('\n').slice(-5);
				summaryLines.push(...lines);
			}
			return { summaryLines } satisfies TaskResult;
		},
	});

	tasks.push(...buildTypecheckTasks(stagedFiles));

	tasks.push({
		title: 'Run tests with coverage',
		async run(ctx) {
			ctx.update('jest --coverage');
			const result = await runCommand('pnpm', ['test:coverage']);
			if (result.code !== 0) {
				throw new CommandError('pnpm test:coverage', result);
			}

			return {
				summaryLines: extractCoverageSummary(result.stdout),
			} satisfies TaskResult;
		},
	});

	await runTasks(tasks);
}

main().catch(() => {
	process.exitCode = 1;
});
