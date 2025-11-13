import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { Command, Option } from 'clipanion';
import type * as chokidarModule from 'chokidar';
import { createReporterCLI as buildReporter } from '../utils/reporter.js';
import type { Reporter } from '@wpkernel/core/reporter';
import {
	WPK_NAMESPACE,
	WPK_EXIT_CODES,
	WPK_CONFIG_SOURCES,
	type WPKExitCode,
} from '@wpkernel/core/contracts';
import { WPKernelError } from '@wpkernel/core/error';
import { adoptCommandEnvironment } from './internal/delegate';
import { buildGenerateCommand } from './generate';
import type { Command as ClipanionCommand } from 'clipanion';
import { forwardProcessOutput } from './process-output';
import { serialiseError } from './internal/serialiseError';
import { COMMAND_HELP } from '../cli/help';

type WatchFn = typeof chokidarModule.watch;

/**
 * Defines the tier of a file change, indicating its impact on regeneration speed.
 *
 * - `fast`: Changes that can be regenerated quickly.
 * - `slow`: Changes that require a more extensive or time-consuming regeneration.
 *
 * @category Commands
 */
export type ChangeTier = 'fast' | 'slow';

/**
 * Represents a file system change that triggers a regeneration cycle.
 *
 * @category Commands
 */
export type Trigger = {
	/** The tier of the change (fast or slow). */
	tier: ChangeTier;
	/** The type of file system event (e.g., 'add', 'change', 'unlink'). */
	event: string;
	/** The path to the file that triggered the change. */
	file: string;
};

/**
 * File system operations interface for start command.
 *
 * @category Commands
 * @public
 */
export interface FileSystem {
	readonly access: typeof fs.access;
	readonly mkdir: typeof fs.mkdir;
	readonly cp: typeof fs.cp;
}

/**
 * Defines the dependencies required by the `start` command.
 *
 * @category Commands
 */
interface BuildStartCommandDependencies {
	/** Function to dynamically load the `chokidar.watch` function. */
	readonly loadWatch: () => Promise<WatchFn>;
	/** Function to build a reporter instance. */
	readonly buildReporter: typeof buildReporter;
	/** Function to build the generate command. */
	readonly buildGenerateCommand: typeof buildGenerateCommand;
	/** Function to adopt the command environment. */
	readonly adoptCommandEnvironment: typeof adoptCommandEnvironment;
	/** File system utility functions. */
	readonly fileSystem: FileSystem;
	/** Function to spawn the Vite development server process. */
	readonly spawnViteProcess: () => ChildProcessWithoutNullStreams;
}

/**
 * Options for building the `start` command, allowing for dependency injection.
 *
 * @category Commands
 */
export interface BuildStartCommandOptions {
	/** Optional: Custom function to load the `chokidar.watch` function. */
	readonly loadWatch?: () => Promise<WatchFn>;
	/** Optional: Custom reporter builder function. */
	readonly buildReporter?: typeof buildReporter;
	/** Optional: Custom generate command builder function. */
	readonly buildGenerateCommand?: typeof buildGenerateCommand;
	/** Optional: Custom function to adopt the command environment. */
	readonly adoptCommandEnvironment?: typeof adoptCommandEnvironment;
	/** Optional: Partial file system utility functions for testing. */
	readonly fileSystem?: Partial<FileSystem>;
	/** Optional: Custom function to spawn the Vite development server process. */
	readonly spawnViteProcess?: () => ChildProcessWithoutNullStreams;
}

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

type ViteHandle = {
	readonly child: ChildProcessWithoutNullStreams;
	readonly exit: Promise<void>;
};

let chokidarModulePromise: Promise<typeof chokidarModule> | null = null;

function mergeDependencies(
	options: BuildStartCommandOptions
): BuildStartCommandDependencies {
	const fileSystem: FileSystem = {
		access: fs.access,
		mkdir: fs.mkdir,
		cp: fs.cp,
		...options.fileSystem,
	} satisfies FileSystem;

	return {
		loadWatch: options.loadWatch ?? loadChokidarWatch,
		buildReporter: options.buildReporter ?? buildReporter,
		buildGenerateCommand:
			options.buildGenerateCommand ?? buildGenerateCommand,
		adoptCommandEnvironment:
			options.adoptCommandEnvironment ?? adoptCommandEnvironment,
		fileSystem,
		spawnViteProcess: options.spawnViteProcess ?? defaultSpawnViteProcess,
	} satisfies BuildStartCommandDependencies;
}

function buildReporterNamespace(): string {
	return `${WPK_NAMESPACE}.cli.start`;
}

function defaultSpawnViteProcess(): ChildProcessWithoutNullStreams {
	return spawn('pnpm', ['exec', 'vite'], {
		cwd: process.cwd(),
		env: {
			...process.env,
			NODE_ENV: process.env.NODE_ENV ?? 'development',
		},
		stdio: 'pipe',
	});
}

async function loadChokidarModule(): Promise<typeof chokidarModule> {
	if (!chokidarModulePromise) {
		chokidarModulePromise = import('chokidar');
	}

	return chokidarModulePromise;
}

async function loadChokidarWatch(): Promise<WatchFn> {
	const module = await loadChokidarModule();
	if (typeof module.watch === 'function') {
		return module.watch;
	}

	if (module.default) {
		const candidate = module.default as unknown;
		if (typeof candidate === 'function') {
			return candidate as WatchFn;
		}

		if (typeof (candidate as { watch?: unknown }).watch === 'function') {
			return (candidate as { watch: WatchFn }).watch;
		}
	}

	throw new WPKernelError('DeveloperError', {
		message: 'Unable to resolve chokidar.watch for CLI start command.',
	});
}

/**
 * Builds the `start` command for the CLI.
 *
 * This command initiates a watch mode for wpk sources, regenerating artifacts
 * on changes and running a Vite development server. It supports debouncing
 * changes and optionally auto-applying generated PHP artifacts.
 *
 * @category Commands
 * @param    options - Options for building the start command, including dependencies.
 * @returns The `Command` class for the start command.
 */
export function buildStartCommand(
	options: BuildStartCommandOptions = {}
): new () => Command {
	const dependencies = mergeDependencies(options);
	const GenerateCommand = dependencies.buildGenerateCommand();

	class NextStartCommand extends Command {
		static override paths = [['start']];

		static override usage = Command.Usage({
			description: COMMAND_HELP.start.description,
			details: COMMAND_HELP.start.details,
			examples: COMMAND_HELP.start.examples,
		});

		verbose = Option.Boolean('--verbose,-v', false);
		autoApply = Option.Boolean('--auto-apply,-a', false);

		#loadWatch = dependencies.loadWatch;
		#reporterFactory = dependencies.buildReporter;
		#adoptEnvironment = dependencies.adoptCommandEnvironment;
		#fileSystem = dependencies.fileSystem;
		#spawnViteProcess = dependencies.spawnViteProcess;

		override async execute(): Promise<WPKExitCode> {
			const reporter = this.#reporterFactory({
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

			let watcher: ReturnType<WatchFn>;
			try {
				const watch = await this.#loadWatch();
				watcher = watch(WATCH_PATTERNS, {
					cwd: process.cwd(),
					ignoreInitial: true,
					ignored: IGNORED_PATTERNS,
				});
			} catch (error) {
				reporter.error(
					'Failed to initialise file watcher.',
					serialiseError(error)
				);
				await this.stopViteDevServer(viteHandle, viteReporter, {
					awaitExit: false,
				});
				throw error;
			}

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
							{
								event: trigger.event,
								file: trigger.file,
								tier: trigger.tier,
							}
						);
					} else {
						reporter.info(
							'Change detected. Scheduling regeneration.',
							{
								event: trigger.event,
								file: trigger.file,
								tier: trigger.tier,
							}
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
							{
								event: trigger.event,
								file: trigger.file,
								tier: trigger.tier,
							}
						);
						return;
					}

					running = true;
					void this.runCycle({
						trigger,
						reporter,
						generateReporter,
					})
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
					file: WPK_CONFIG_SOURCES.WPK_CONFIG_TS,
				});
			});

			return exitCode;
		}

		private async runCycle({
			trigger,
			reporter,
			generateReporter,
		}: {
			trigger: Trigger;
			reporter: Reporter;
			generateReporter: Reporter;
		}): Promise<void> {
			reporter.info('Regenerating artifacts.', {
				event: trigger.event,
				file: trigger.file,
				tier: trigger.tier,
			});

			const command = new GenerateCommand();
			this.#adoptEnvironment(
				this as unknown as ClipanionCommand,
				command
			);
			(command as { dryRun?: boolean }).dryRun = false;
			(command as { verbose?: boolean }).verbose = this.verbose;

			let exitCode: WPKExitCode;
			try {
				const result = await command.execute();
				exitCode =
					typeof result === 'number'
						? (result as WPKExitCode)
						: WPK_EXIT_CODES.SUCCESS;
			} catch (error) {
				reporter.error(
					'Generation pipeline failed to execute.',
					serialiseError(error)
				);
				return;
			}

			if (exitCode !== WPK_EXIT_CODES.SUCCESS) {
				reporter.warn('Generation completed with errors.', {
					exitCode,
				});
				return;
			}

			reporter.info('Generation completed successfully.');

			if (this.autoApply) {
				await this.autoApplyPhpArtifacts(
					reporter.child('apply'),
					generateReporter
				);
			}
		}

		private async autoApplyPhpArtifacts(
			reporter: Reporter,
			generateReporter: Reporter
		): Promise<void> {
			const sourceDir = path.resolve(process.cwd(), PHP_GENERATED_DIR);
			const targetDir = path.resolve(process.cwd(), PHP_TARGET_DIR);

			try {
				await this.#fileSystem.access(sourceDir);
			} catch {
				reporter.debug('No PHP artifacts to apply.', {
					sourceDir: toWorkspaceRelativePath(sourceDir),
				});
				return;
			}

			try {
				await this.#fileSystem.mkdir(targetDir, { recursive: true });
				await this.#fileSystem.cp(sourceDir, targetDir, {
					recursive: true,
				});
				reporter.info('Applied generated PHP artifacts.', {
					source: toWorkspaceRelativePath(sourceDir),
					target: toWorkspaceRelativePath(targetDir),
				});
			} catch (error) {
				reporter.warn(
					'Failed to auto-apply PHP artifacts.',
					serialiseError(error)
				);
				generateReporter.warn(
					'Failed to auto-apply PHP artifacts.',
					serialiseError(error)
				);
			}
		}

		protected createViteDevProcess(): ChildProcessWithoutNullStreams {
			return this.#spawnViteProcess();
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

			forwardProcessOutput({
				child,
				reporter,
				label: 'Vite dev server',
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
			reporter: Reporter,
			stopOptions: { awaitExit?: boolean } = {}
		): Promise<void> {
			const { awaitExit = true } = stopOptions;
			const { child, exit } = handle;
			if (child.killed) {
				if (awaitExit) {
					await exit;
				}
				return;
			}

			const stopped = child.kill('SIGINT');
			if (!stopped) {
				reporter.debug('Vite dev server already stopped.');
				if (awaitExit) {
					await exit;
				}
				return;
			}

			if (!awaitExit) {
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
	}

	return NextStartCommand;
}

function toWorkspaceRelativePath(absolute: string): string {
	const relative = path.relative(process.cwd(), absolute);
	if (relative === '') {
		return '.';
	}

	return relative.split(path.sep).join('/');
}

/**
 * Detects the change tier (fast or slow) for a given file path.
 *
 * Files in `contracts/` or `schemas/` are considered 'slow' changes,
 * as they often require more extensive regeneration.
 *
 * @category Commands
 * @param    filePath - The path to the changed file.
 * @returns The `ChangeTier` for the file.
 */
export function detectTier(filePath: string): ChangeTier {
	const relative = normaliseForLog(filePath).toLowerCase();
	if (relative.startsWith('contracts/') || relative.startsWith('schemas/')) {
		return 'slow';
	}

	return 'fast';
}

function normaliseForLog(filePath: string): string {
	const absolute = path.isAbsolute(filePath)
		? filePath
		: path.resolve(process.cwd(), filePath);
	const relative = path.relative(process.cwd(), absolute);
	if (relative === '') {
		return '.';
	}
	return relative.split(path.sep).join('/');
}

/**
 * Prioritises a new incoming trigger over a currently queued trigger.
 *
 * A 'slow' incoming trigger will always override a 'fast' current trigger.
 * If both are 'slow' or both are 'fast', the incoming trigger takes precedence.
 *
 * @category Commands
 * @param    current  - The currently queued trigger, or null if none.
 * @param    incoming - The new incoming trigger.
 * @returns The trigger that should be processed next.
 */
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
