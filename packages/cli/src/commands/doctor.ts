import path from 'node:path';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { Command } from 'clipanion';
import { createReporterCLI as buildReporter } from '../utils/reporter.js';
import type { Reporter } from '@wpkernel/core/reporter';
import { WPK_NAMESPACE, WPK_EXIT_CODES } from '@wpkernel/core/contracts';
import { serialiseError } from './internal/serialiseError';
import { loadWPKernelConfig } from '../config';
import type { LoadedWPKernelConfig } from '../config/types';
import { buildWorkspace, ensureGeneratedPhpClean } from '../workspace';
import type { Workspace } from '../workspace';

const execFile = promisify(execFileCallback);

/**
 * Status of a doctor check.
 *
 * @category Doctor Command
 * @public
 */
export type DoctorStatus = 'pass' | 'warn' | 'fail';

/**
 * Result from a doctor check.
 *
 * @category Doctor Command
 * @public
 */
export interface DoctorCheckResult {
	readonly key: string;
	readonly label: string;
	readonly status: DoctorStatus;
	readonly message: string;
}

/**
 * Options for checking PHP environment.
 *
 * @category Doctor Command
 * @public
 */
export interface CheckPhpEnvironmentOptions {
	readonly reporter: Reporter;
	readonly workspaceRoot?: string | null;
}

interface DoctorDependencies {
	readonly loadWPKernelConfig: typeof loadWPKernelConfig;
	readonly buildWorkspace: typeof buildWorkspace;
	readonly ensureGeneratedPhpClean: typeof ensureGeneratedPhpClean;
	readonly buildReporter: typeof buildReporter;
	readonly checkPhpEnvironment: (
		options: CheckPhpEnvironmentOptions
	) => Promise<DoctorCheckResult[]>;
}

/**
 * Options for building the `doctor` command, allowing for dependency injection.
 *
 * @category Doctor Command
 */
export interface BuildDoctorCommandOptions {
	/** Optional: Custom function to load the WP Kernel configuration. */
	readonly loadWPKernelConfig?: typeof loadWPKernelConfig;
	/** Optional: Custom workspace builder function. */
	readonly buildWorkspace?: typeof buildWorkspace;
	/** Optional: Custom function to ensure the generated PHP directory is clean. */
	readonly ensureGeneratedPhpClean?: typeof ensureGeneratedPhpClean;
	/** Optional: Custom reporter builder function. */
	readonly buildReporter?: typeof buildReporter;
	/** Optional: Custom function to check the PHP environment. */
	readonly checkPhpEnvironment?: (
		options: CheckPhpEnvironmentOptions
	) => Promise<DoctorCheckResult[]>;
}

function mergeDependencies(
	options: BuildDoctorCommandOptions
): DoctorDependencies {
	return {
		loadWPKernelConfig: options.loadWPKernelConfig ?? loadWPKernelConfig,
		buildWorkspace: options.buildWorkspace ?? buildWorkspace,
		ensureGeneratedPhpClean:
			options.ensureGeneratedPhpClean ?? ensureGeneratedPhpClean,
		buildReporter: options.buildReporter ?? buildReporter,
		checkPhpEnvironment:
			options.checkPhpEnvironment ?? defaultCheckPhpEnvironment,
	} satisfies DoctorDependencies;
}

function buildReporterNamespace(): string {
	return `${WPK_NAMESPACE}.cli.doctor`;
}

/**
 * Builds the `doctor` command for the CLI.
 *
 * This command runs various health checks for the WP Kernel project,
 * including configuration, Composer autoloading, PHP tooling, and workspace hygiene.
 *
 * @category Doctor Command
 * @param    options - Options for building the doctor command, including dependencies.
 * @returns The `Command` class for the doctor command.
 */
export function buildDoctorCommand(
	options: BuildDoctorCommandOptions = {}
): new () => Command {
	const dependencies = mergeDependencies(options);

	class NextDoctorCommand extends Command {
		static override paths = [['doctor']];

		static override usage = Command.Usage({
			description:
				'Run health checks for wpk config, Composer autoload, PHP tooling, and workspace hygiene.',
		});

		override async execute(): Promise<number> {
			const reporter = dependencies.buildReporter({
				namespace: buildReporterNamespace(),
				level: 'info',
				enabled: process.env.NODE_ENV !== 'test',
			});

			const results: DoctorCheckResult[] = [];

			const configResult = await this.checkWPKernelConfig({
				reporter,
				deps: dependencies,
			});
			results.push(configResult.result);

			const { loadedConfig, workspace } = configResult;

			if (loadedConfig) {
				results.push(
					this.describeComposerCheck(
						loadedConfig,
						reporter.child('composer')
					)
				);

				results.push(
					await this.checkWorkspaceHygiene({
						deps: dependencies,
						workspace,
						reporter: reporter.child('workspace'),
					})
				);
			}

			const phpResults = await dependencies.checkPhpEnvironment({
				reporter: reporter.child('php'),
				workspaceRoot: workspace?.root,
			});
			results.push(...phpResults);

			this.context.stdout.write(renderDoctorSummary(results));

			const hasFailure = results.some(
				(result) => result.status === 'fail'
			);

			return hasFailure
				? WPK_EXIT_CODES.UNEXPECTED_ERROR
				: WPK_EXIT_CODES.SUCCESS;
		}

		private async checkWPKernelConfig({
			reporter,
			deps,
		}: {
			reporter: Reporter;
			deps: DoctorDependencies;
		}): Promise<{
			result: DoctorCheckResult;
			loadedConfig: LoadedWPKernelConfig | null;
			workspace: Workspace | null;
		}> {
			try {
				const loaded = await deps.loadWPKernelConfig();
				reporter.info('Kernel config loaded successfully.', {
					sourcePath: loaded.sourcePath,
					origin: loaded.configOrigin,
					namespace: loaded.namespace,
				});

				const workspaceRoot = path.dirname(loaded.sourcePath);
				const workspace = deps.buildWorkspace(workspaceRoot);

				return {
					result: {
						key: 'kernel-config',
						label: 'Kernel config',
						status: 'pass',
						message: `Loaded from ${toRelative(workspaceRoot)}.`,
					},
					loadedConfig: loaded,
					workspace,
				};
			} catch (error) {
				reporter.error('Failed to load wpk config.', {
					error: serialiseError(error),
				});

				return {
					result: {
						key: 'kernel-config',
						label: 'Kernel config',
						status: 'fail',
						message:
							'Resolve config validation errors before running other commands.',
					},
					loadedConfig: null,
					workspace: null,
				};
			}
		}

		private describeComposerCheck(
			loaded: LoadedWPKernelConfig,
			reporter: Reporter
		): DoctorCheckResult {
			if (loaded.composerCheck === 'ok') {
				reporter.info('Composer autoload mapping verified.');
				return {
					key: 'composer',
					label: 'Composer autoload',
					status: 'pass',
					message: 'composer.json maps a PSR-4 namespace to inc/.',
				} satisfies DoctorCheckResult;
			}

			reporter.warn('Composer autoload mapping mismatch.');
			return {
				key: 'composer',
				label: 'Composer autoload',
				status: 'warn',
				message:
					'Update composer.json to map your PHP namespace to inc/.',
			} satisfies DoctorCheckResult;
		}

		private async checkWorkspaceHygiene({
			deps,
			workspace,
			reporter,
		}: {
			deps: DoctorDependencies;
			workspace: Workspace | null;
			reporter: Reporter;
		}): Promise<DoctorCheckResult> {
			if (!workspace) {
				return {
					key: 'workspace',
					label: 'Workspace hygiene',
					status: 'warn',
					message: 'Workspace not resolved; skipping hygiene check.',
				} satisfies DoctorCheckResult;
			}

			try {
				await deps.ensureGeneratedPhpClean({
					workspace,
					reporter,
					yes: false,
				});
				reporter.info('Generated PHP directory is clean.');
				return {
					key: 'workspace',
					label: 'Workspace hygiene',
					status: 'pass',
					message: 'Generated PHP directory has no pending changes.',
				} satisfies DoctorCheckResult;
			} catch (error) {
				reporter.warn('Workspace hygiene check failed.', {
					error: serialiseError(error),
				});
				return {
					key: 'workspace',
					label: 'Workspace hygiene',
					status: 'warn',
					message:
						'Review generated PHP changes or reset .generated/php/.',
				} satisfies DoctorCheckResult;
			}
		}
	}

	return NextDoctorCommand;
}

/**
 * Renders a summary of the doctor check results for display in the CLI.
 *
 * @category Doctor Command
 * @param    results - An array of `DoctorCheckResult` objects.
 * @returns A formatted string representing the summary of health checks.
 */
export function renderDoctorSummary(
	results: readonly DoctorCheckResult[]
): string {
	const lines: string[] = ['Health checks:'];

	if (results.length === 0) {
		lines.push('- No checks executed.');
	} else {
		for (const result of results) {
			const statusLabel = formatStatus(result.status);
			lines.push(`- [${statusLabel}] ${result.label}: ${result.message}`);
		}
	}

	return `${lines.join('\n')}\n`;
}

function formatStatus(status: DoctorStatus): string {
	const map: Record<DoctorStatus, string> = {
		pass: 'PASS',
		warn: 'WARN',
		fail: 'FAIL',
	};

	return map[status] ?? 'UNKNOWN';
}

function toRelative(absolute: string): string {
	const relative = path.relative(process.cwd(), absolute);
	if (!relative) {
		return '.';
	}

	return relative.split(path.sep).join('/');
}

async function defaultCheckPhpEnvironment({
	reporter,
}: CheckPhpEnvironmentOptions): Promise<DoctorCheckResult[]> {
	const results: DoctorCheckResult[] = [];

	try {
		await import('@wpkernel/php-driver');
		reporter.info('`@wpkernel/php-driver` resolved.');
		results.push({
			key: 'php-driver',
			label: 'PHP driver',
			status: 'pass',
			message: '@wpkernel/php-driver is available.',
		});
	} catch (error) {
		reporter.error('Unable to resolve `@wpkernel/php-driver`.', {
			error: serialiseError(error),
		});
		results.push({
			key: 'php-driver',
			label: 'PHP driver',
			status: 'fail',
			message: 'Install @wpkernel/php-driver in your workspace.',
		});
		return results;
	}

	try {
		await execFile('php', ['--version']);
		reporter.info('PHP binary detected.');
		results.push({
			key: 'php-runtime',
			label: 'PHP runtime',
			status: 'pass',
			message: 'PHP binary available on PATH.',
		});
	} catch (error) {
		reporter.warn('PHP binary not detected.', {
			error: serialiseError(error),
		});
		results.push({
			key: 'php-runtime',
			label: 'PHP runtime',
			status: 'warn',
			message: 'Install PHP 8.1+ so apply workflows can run locally.',
		});
	}

	return results;
}
