import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { Command, Option } from 'clipanion';
import type * as chokidarModule from 'chokidar';
import { createReporter as buildReporter } from '@wpkernel/core/reporter';
import { type Reporter } from '@wpkernel/core/reporter';
import {
	WPK_NAMESPACE,
	WPK_EXIT_CODES,
	WPK_CONFIG_SOURCES,
	type WPKExitCode,
} from '@wpkernel/core/contracts';
import { KernelError } from '@wpkernel/core/error';
import { adoptCommandEnvironment } from './internal/delegate';
import { buildGenerateCommand } from './generate';
import type { Command as ClipanionCommand } from 'clipanion';
import { forwardProcessOutput } from '../../commands/process-output';
import { serialiseError } from './internal/serialiseError';

type WatchFn = typeof chokidarModule.watch;

export type ChangeTier = 'fast' | 'slow';

export type Trigger = {
	tier: ChangeTier;
	event: string;
	file: string;
};

interface FileSystem {
	readonly access: typeof fs.access;
	readonly mkdir: typeof fs.mkdir;
	readonly cp: typeof fs.cp;
}

interface BuildStartCommandDependencies {
	readonly loadWatch: () => Promise<WatchFn>;
	readonly buildReporter: typeof buildReporter;
	readonly buildGenerateCommand: typeof buildGenerateCommand;
	readonly adoptCommandEnvironment: typeof adoptCommandEnvironment;
	readonly fileSystem: FileSystem;
	readonly spawnViteProcess: () => ChildProcessWithoutNullStreams;
}

export interface BuildStartCommandOptions {
	readonly loadWatch?: () => Promise<WatchFn>;
	readonly buildReporter?: typeof buildReporter;
	readonly buildGenerateCommand?: typeof buildGenerateCommand;
	readonly adoptCommandEnvironment?: typeof adoptCommandEnvironment;
	readonly fileSystem?: Partial<FileSystem>;
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
	return `${WPK_NAMESPACE}.cli.next.start`;
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

	throw new KernelError('DeveloperError', {
		message: 'Unable to resolve chokidar.watch for CLI start command.',
	});
}

export function buildStartCommand(
	options: BuildStartCommandOptions = {}
): new () => Command {
	const dependencies = mergeDependencies(options);
	const GenerateCommand = dependencies.buildGenerateCommand();

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

			const watch = await this.#loadWatch();
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

			if (this.autoApplyPhp) {
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
