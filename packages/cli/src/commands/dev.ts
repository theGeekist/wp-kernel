import path from 'node:path';
import fs from 'node:fs/promises';
import chokidar from 'chokidar';
import { Command, Option } from 'clipanion';
import { createReporter } from '@geekist/wp-kernel';
import type { Reporter } from '@geekist/wp-kernel';
import {
	WPK_CONFIG_SOURCES,
	WPK_NAMESPACE,
} from '@geekist/wp-kernel/namespace/constants';
import { runGenerate, type ExitCode } from './run-generate';
import { serialiseError } from './run-generate';
import { toWorkspaceRelative } from '../utils';

const KERNEL_CONFIG_BASE = WPK_CONFIG_SOURCES.KERNEL_CONFIG_TS.replace(
	/\.ts$/,
	''
);

const WATCH_PATTERNS = [
	WPK_CONFIG_SOURCES.KERNEL_CONFIG_TS,
	WPK_CONFIG_SOURCES.KERNEL_CONFIG_JS,
	`${KERNEL_CONFIG_BASE}.cjs`,
	`${KERNEL_CONFIG_BASE}.mjs`,
	`${KERNEL_CONFIG_BASE}.mts`,
	`${KERNEL_CONFIG_BASE}.cts`,
	`${KERNEL_CONFIG_BASE}.json`,
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

type ChangeTier = 'fast' | 'slow';

/**
 * File system change metadata tracked by the dev command.
 */
export type Trigger = {
	tier: ChangeTier;
	event: string;
	file: string;
};

/**
 * Clipanion command that watches kernel sources and regenerates artifacts.
 */
export class DevCommand extends Command {
	static override paths = [['dev']];

	static override usage = Command.Usage({
		description: 'Watch kernel config and regenerate artifacts on change.',
		examples: [
			['Start watch mode with default settings', 'wpk dev'],
			[
				'Enable verbose logging and PHP auto-apply',
				'wpk dev --verbose --auto-apply-php',
			],
		],
	});

	verbose = Option.Boolean('--verbose', false);
	autoApplyPhp = Option.Boolean('--auto-apply-php', false);

	private watchFactory: typeof chokidar.watch = chokidar.watch;

	override async execute(): Promise<ExitCode> {
		const reporter = createReporter({
			namespace: `${WPK_NAMESPACE}.cli.dev`,
			level: this.verbose ? 'debug' : 'info',
			enabled: process.env.NODE_ENV !== 'test',
		});
		const generateReporter = reporter.child('generate');

		const watcher = this.watchFactory(WATCH_PATTERNS, {
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

		const exitCode = await new Promise<ExitCode>((resolve) => {
			const resolveOnce = (code: ExitCode) => {
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
				reporter.info('Stopping watch mode.', { reason });
				clearTimers();
				try {
					await watcher.close();
				} catch (error) {
					reporter.warn(
						'Failed to close watcher.',
						serialiseError(error)
					);
				}
				cleanupSignals();
				resolveOnce(0);
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
					reporter.info('Change detected. Scheduling regeneration.', {
						event: trigger.event,
						file: trigger.file,
						tier: trigger.tier,
					});
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

			// Kick off an initial generation synchronously.
			queueRun({
				tier: 'slow',
				event: 'initial',
				file: KERNEL_CONFIG_BASE,
			});

			// Ensure shutdown when watcher closes naturally.
			// chokidar does not type the `close` event in its public API, so we
			// rely on the explicit shutdown path instead of attaching a listener
			// here. The `shutdown` helper resolves `exitCode` once the watcher
			// closes and cleans up signal handlers.
		});

		return exitCode;
	}

	private async runCycle(
		trigger: Trigger,
		reporter: Reporter,
		generateReporter: Reporter
	): Promise<void> {
		reporter.info('Regenerating artifacts.', {
			event: trigger.event,
			file: trigger.file,
			tier: trigger.tier,
		});

		const result = await runGenerate({
			dryRun: false,
			verbose: this.verbose,
			reporter: generateReporter,
		});

		if (result.output) {
			this.context.stdout.write(result.output);
		}

		if (result.exitCode !== 0) {
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
			await fs.mkdir(targetDir, { recursive: true });
			await fs.cp(sourceDir, targetDir, { recursive: true });
			reporter.info('Applied generated PHP artifacts.', {
				source: toWorkspaceRelative(sourceDir),
				target: toWorkspaceRelative(targetDir),
			});
		} catch (error) {
			reporter.warn(
				'Failed to auto-apply PHP artifacts.',
				serialiseError(error)
			);
		}
	}
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
	const workspaceRelative = toWorkspaceRelative(absolute);
	return workspaceRelative.split(path.sep).join('/');
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
