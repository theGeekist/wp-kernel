import path from 'node:path';
import fs from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import type * as chokidarModule from 'chokidar';
import { Command, Option } from 'clipanion';
import { createReporter as defaultBuildReporter } from '@wpkernel/core/reporter';
import {
	WPK_CONFIG_SOURCES,
	WPK_NAMESPACE,
	WPK_EXIT_CODES,
	type WPKExitCode,
} from '@wpkernel/core/contracts';
import type { Reporter } from '@wpkernel/core/reporter';
import { serialiseError } from '../../commands/run-generate/reporting';
import {
	mergeDependencies,
	runGeneration,
	type BuildGenerateCommandOptions as SharedBuildGenerateCommandOptions,
} from './generate/runtime';

type WatchFn = typeof chokidarModule.watch;

type ChangeTier = 'fast' | 'slow';

export type Trigger = {
	tier: ChangeTier;
	event: string;
	file: string;
};

type ViteHandle = {
	child: ChildProcessWithoutNullStreams;
	exit: Promise<void>;
};

const WPK_CONFIG_BASE = WPK_CONFIG_SOURCES.WPK_CONFIG_TS.replace(/\.ts$/, '');

const WATCH_PATTERNS = [
	WPK_CONFIG_SOURCES.WPK_CONFIG_TS,
	WPK_CONFIG_SOURCES.WPK_CONFIG_JS,
	`${WPK_CONFIG_BASE}.cjs`,
	`${WPK_CONFIG_BASE}.mjs`,
	`${WPK_CONFIG_BASE}.mts`,
	`${WPK_CONFIG_BASE}.cts`,
	`${WPK_CONFIG_BASE}.json`,
	'contracts/**/*',
	'schemas/**/*',
	'src/resources/**/*',
	'blocks/**/*',
];

const IGNORED_PATTERNS = [
	'**/.git/**',
	'**/node_modules/**',
	'**/.generated/**',
	'**/build/**',
];

const FAST_DEBOUNCE_MS = 200;
const SLOW_DEBOUNCE_MS = 600;

const PHP_GENERATED_DIR = path.join('.generated', 'php');
const PHP_TARGET_DIR = 'inc';

function buildReporterNamespace(): string {
	return `${WPK_NAMESPACE}.cli.next.start`;
}

async function loadChokidarModule(): Promise<typeof chokidarModule> {
	return import('chokidar');
}

async function loadChokidarWatch(): Promise<WatchFn> {
	const module = await loadChokidarModule();
	if (typeof module.watch === 'function') {
		return module.watch;
	}

	const candidate = module.default as unknown;
	if (typeof candidate === 'function') {
		return candidate as WatchFn;
	}

	if (
		candidate &&
		typeof (candidate as { watch?: unknown }).watch === 'function'
	) {
		return ((candidate as { watch: unknown }).watch ??
			module.watch) as WatchFn;
	}

	throw new Error('Unable to resolve chokidar.watch for CLI start command.');
}

export interface BuildStartCommandOptions
	extends SharedBuildGenerateCommandOptions {
	readonly buildReporter?: typeof defaultBuildReporter;
	readonly loadWatch?: () => Promise<WatchFn>;
}

export function buildStartCommand(
	options: BuildStartCommandOptions = {}
): new () => Command {
	const dependencies = mergeDependencies(options);
	const buildReporter = options.buildReporter ?? defaultBuildReporter;
	const loadWatch = options.loadWatch ?? loadChokidarWatch;

	class NextStartCommand extends Command {
		static override paths = [['start']];

		static override usage = Command.Usage({
			description:
				'Watch kernel sources, regenerate on change, and run the Vite dev server.',
			examples: [
				['Start watch mode with default settings', 'wpk start'],
				[
					'Enable verbose logging and PHP auto-apply',
					'wpk start --verbose --auto-apply-php',
				],
			],
		});

		verbose = Option.Boolean('--verbose', false);
		autoApplyPhp = Option.Boolean('--auto-apply-php', false);

		override async execute(): Promise<WPKExitCode> {
			const reporter = buildReporter({
				namespace: buildReporterNamespace(),
				level: this.verbose ? 'debug' : 'info',
				enabled: process.env.NODE_ENV !== 'test',
			});
			const generateReporter = reporter.child('generate');
			const viteReporter = reporter.child('vite');

			const viteHandle = await this.launchViteDevServer(viteReporter);
			if (!viteHandle) {
				return WPK_EXIT_CODES.UNEXPECTED_ERROR;
			}

			const watch = await loadWatch();
			const watcher = watch(WATCH_PATTERNS, {
				cwd: process.cwd(),
				ignoreInitial: true,
				ignored: IGNORED_PATTERNS,
			});

			const timers: Partial<Record<ChangeTier, NodeJS.Timeout>> = {};
			const pending: Partial<Record<ChangeTier, Trigger>> = {};
			let running = false;
			let queued: Trigger | null = null;
			let exitResolved = false;

			const clearTimers = () => {
				for (const key of Object.keys(timers) as ChangeTier[]) {
					const timer = timers[key];
					if (timer) {
						clearTimeout(timer);
						timers[key] = undefined;
					}
				}
				for (const key of Object.keys(pending) as ChangeTier[]) {
					pending[key] = undefined;
				}
			};

			const exitCode = await new Promise<WPKExitCode>((resolve) => {
				const resolveOnce = (code: WPKExitCode) => {
					if (exitResolved) {
						return;
					}
					exitResolved = true;
					resolve(code);
				};

				const cleanupSignals = () => {
					process.removeListener('SIGINT', signalHandler);
					process.removeListener('SIGTERM', signalHandler);
				};

				const shutdown = async (reason: string) => {
					reporter.info('Stopping start workflow.', { reason });
					clearTimers();
					try {
						await watcher.close();
					} catch (error) {
						reporter.warn(
							'Failed to close watcher.',
							serialiseError(error)
						);
					}

					await this.stopViteDevServer(viteHandle, viteReporter);

					cleanupSignals();
					resolveOnce(WPK_EXIT_CODES.SUCCESS);
				};

				const signalHandler = () => {
					reporter.info('Received shutdown signal.');
					void shutdown('signal');
				};

				process.once('SIGINT', signalHandler);
				process.once('SIGTERM', signalHandler);

				watcher.on('all', (event, filePath) => {
					const tier = detectTier(filePath);
					const trigger: Trigger = {
						tier,
						event,
						file: normaliseForLog(filePath),
					};
					scheduleTrigger(trigger);
				});

				watcher.on('error', (error) => {
					reporter.error('Watcher error.', serialiseError(error));
				});

				const scheduleTrigger = (trigger: Trigger) => {
					if (trigger.tier === 'slow' && timers.fast) {
						clearTimeout(timers.fast);
						timers.fast = undefined;
						pending.fast = undefined;
					}

					pending[trigger.tier] = trigger;

					const delay =
						trigger.tier === 'slow'
							? SLOW_DEBOUNCE_MS
							: FAST_DEBOUNCE_MS;

					if (timers[trigger.tier]) {
						clearTimeout(timers[trigger.tier]!);
					} else if (running) {
						reporter.debug(
							'Queueing change while generation is running.',
							trigger
						);
					} else {
						reporter.info(
							'Change detected. Scheduling regeneration.',
							trigger
						);
					}

					timers[trigger.tier] = setTimeout(() => {
						timers[trigger.tier] = undefined;
						const pendingTrigger = pending[trigger.tier];
						pending[trigger.tier] = undefined;
						if (pendingTrigger) {
							queueRun(pendingTrigger);
						}
					}, delay);
				};

				const queueRun = (trigger: Trigger) => {
					if (running) {
						queued = prioritiseQueued(queued, trigger);
						reporter.debug(
							'Generation already running, retaining latest trigger.',
							trigger
						);
						return;
					}

					running = true;
					void this.runCycle(trigger, reporter, generateReporter)
						.catch((error) => {
							reporter.error(
								'Unexpected error during generation cycle.',
								serialiseError(error)
							);
						})
						.finally(() => {
							running = false;
							if (queued) {
								const next = queued;
								queued = null;
								queueRun(next);
							}
						});
				};

				queueRun({
					tier: 'slow',
					event: 'initial',
					file: WPK_CONFIG_BASE,
				});

				void viteHandle.exit.then(() => {
					reporter.warn(
						'Vite dev server exited unexpectedly. Stopping watcher.'
					);
					void shutdown('vite-exit');
				});
			});

			return exitCode;
		}

		protected createViteDevProcess(): ChildProcessWithoutNullStreams {
			return spawn('pnpm', ['exec', 'vite'], {
				cwd: process.cwd(),
				env: {
					...process.env,
					NODE_ENV: process.env.NODE_ENV ?? 'development',
				},
				stdio: 'pipe',
			});
		}

		private async launchViteDevServer(
			reporter: Reporter
		): Promise<ViteHandle | null> {
			reporter.info('Starting Vite dev server.');

			let child: ChildProcessWithoutNullStreams;
			try {
				child = this.createViteDevProcess();
			} catch (error) {
				reporter.error('Failed to start Vite dev server.', {
					error: serialiseError(error),
				});
				return null;
			}

			child.stdout?.on('data', (chunk) => {
				reporter.info(chunk.toString());
			});
			child.stderr?.on('data', (chunk) => {
				reporter.warn(chunk.toString());
			});

			const exit = new Promise<void>((resolve) => {
				let resolved = false;
				const resolveOnce = () => {
					if (!resolved) {
						resolved = true;
						resolve();
					}
				};

				child.once('error', (error) => {
					reporter.error('Vite dev server error.', {
						error: serialiseError(error),
					});
					resolveOnce();
				});
				child.once('exit', (code, signal) => {
					reporter.info('Vite dev server exited.', {
						exitCode: code,
						signal,
					});
					resolveOnce();
				});
			});

			return { child, exit };
		}

		private async stopViteDevServer(
			handle: ViteHandle,
			reporter: Reporter
		): Promise<void> {
			const { child, exit } = handle;
			if (child.killed) {
				await exit;
				return;
			}

			const stopped = child.kill('SIGINT');
			if (!stopped) {
				reporter.debug('Vite dev server already stopped.');
				await exit;
				return;
			}

			const timeout = setTimeout(() => {
				if (!child.killed) {
					reporter.warn(
						'Vite dev server did not exit, sending SIGTERM.'
					);
					child.kill('SIGTERM');
				}
			}, 2000);

			try {
				await exit;
			} finally {
				clearTimeout(timeout);
			}
		}

		private async runCycle(
			trigger: Trigger,
			reporter: Reporter,
			generateReporter: Reporter
		): Promise<void> {
			reporter.info('Regenerating artifacts.', trigger);

			const result = await runGeneration(dependencies, {
				reporter: generateReporter,
				verbose: this.verbose,
				dryRun: false,
				stdout: this.context.stdout,
			});

			if (result.exitCode !== WPK_EXIT_CODES.SUCCESS) {
				reporter.warn('Generation completed with errors.', {
					exitCode: result.exitCode,
				});
				return;
			}

			if (this.autoApplyPhp) {
				await this.autoApplyPhpArtifacts(reporter.child('apply'));
			}
		}

		private async autoApplyPhpArtifacts(reporter: Reporter): Promise<void> {
			const sourceDir = path.resolve(process.cwd(), PHP_GENERATED_DIR);
			const targetDir = path.resolve(process.cwd(), PHP_TARGET_DIR);

			try {
				await fs.access(sourceDir);
			} catch {
				reporter.debug('No PHP artifacts to apply.', { sourceDir });
				return;
			}

			try {
				const snapshot = await collectDirectorySnapshot(sourceDir);
				await fs.mkdir(targetDir, { recursive: true });
				await pruneStaleEntries(targetDir, snapshot);
				await fs.cp(sourceDir, targetDir, { recursive: true });
				reporter.info('Applied generated PHP artifacts.', {
					source: toWorkspaceRelativePath(sourceDir),
					target: toWorkspaceRelativePath(targetDir),
				});
			} catch (error) {
				reporter.warn(
					'Failed to auto-apply PHP artifacts.',
					serialiseError(error)
				);
			}
		}
	}

	return NextStartCommand;
}

export function detectTier(filePath: string): ChangeTier {
	const relative = normaliseForLog(filePath).toLowerCase();
	if (relative.startsWith('contracts/') || relative.startsWith('schemas/')) {
		return 'slow';
	}

	return 'fast';
}

type DirectorySnapshot = {
	files: Set<string>;
	directories: Set<string>;
};

async function collectDirectorySnapshot(
	root: string
): Promise<DirectorySnapshot> {
	const files = new Set<string>();
	const directories = new Set<string>();

	const walk = async (current: string, relative: string): Promise<void> => {
		let entries: Dirent[];
		try {
			entries = await fs.readdir(current, { withFileTypes: true });
		} catch (error) {
			if (isNotFoundError(error)) {
				return;
			}
			throw error;
		}

		for (const entry of entries) {
			const entryRelative = buildRelativePath(relative, entry.name);
			if (entry.isDirectory()) {
				directories.add(entryRelative);
				await walk(path.join(current, entry.name), entryRelative);
			} else {
				files.add(entryRelative);
			}
		}
	};

	await walk(root, '');

	return { files, directories };
}

async function pruneStaleEntries(
	targetRoot: string,
	snapshot: DirectorySnapshot,
	relative = ''
): Promise<void> {
	const current = relative ? path.join(targetRoot, relative) : targetRoot;
	let entries: Dirent[];

	try {
		entries = await fs.readdir(current, { withFileTypes: true });
	} catch (error) {
		if (isNotFoundError(error)) {
			return;
		}
		throw error;
	}

	for (const entry of entries) {
		const entryRelative = buildRelativePath(relative, entry.name);
		const entryPath = path.join(current, entry.name);

		if (entry.isDirectory()) {
			if (!snapshot.directories.has(entryRelative)) {
				await fs.rm(entryPath, { recursive: true, force: true });
				continue;
			}

			await pruneStaleEntries(targetRoot, snapshot, entryRelative);
			continue;
		}

		if (!snapshot.files.has(entryRelative)) {
			await fs.rm(entryPath, { force: true });
		}
	}
}

function buildRelativePath(relative: string, entry: string): string {
	return relative === '' ? entry : `${relative}/${entry}`;
}

function isNotFoundError(error: unknown): error is NodeJS.ErrnoException {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		(error as NodeJS.ErrnoException).code === 'ENOENT'
	);
}

function normaliseForLog(filePath: string): string {
	const absolute = path.isAbsolute(filePath)
		? filePath
		: path.resolve(process.cwd(), filePath);
	const workspaceRelative = path.relative(process.cwd(), absolute);
	return workspaceRelative.split(path.sep).join('/');
}

function toWorkspaceRelativePath(absolute: string): string {
	const relative = path.relative(process.cwd(), absolute);
	return relative === '' ? '.' : relative.split(path.sep).join('/');
}

export function prioritiseQueued(
	current: Trigger | null,
	incoming: Trigger
): Trigger {
	if (!current) {
		return incoming;
	}

	if (incoming.tier === 'slow' && current.tier === 'fast') {
		return incoming;
	}

	return current.tier === 'slow' && incoming.tier === 'fast'
		? current
		: incoming;
}
