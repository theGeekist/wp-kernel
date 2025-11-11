import path from 'node:path';
import { Command } from 'clipanion';
import { createReporterCLI as buildReporter } from '../utils/reporter.js';
import type { Reporter } from '@wpkernel/core/reporter';
import { WPK_NAMESPACE, WPK_EXIT_CODES } from '@wpkernel/core/contracts';
import { serialiseError } from './internal/serialiseError';
import { loadWPKernelConfig } from '../config';
import type { LoadedWPKernelConfig } from '../config/types';
import { buildWorkspace } from '../workspace';
import type { Workspace } from '../workspace';
import {
	buildDefaultReadinessRegistry,
	DEFAULT_READINESS_ORDER,
	type BuildDefaultReadinessRegistryOptions,
	type DefaultReadinessHelperOverrides,
	type DxContext,
	type ReadinessKey,
	type ReadinessOutcome,
	type ReadinessOutcomeStatus,
} from '../dx';
import { getCliPackageRoot } from '../utils/module-url';
import { resolveCommandCwd } from './init/command-runtime';

/**
 * Status of a doctor check.
 *
 * @category Commands
 * @public
 */
export type DoctorStatus = 'pass' | 'warn' | 'fail';

/**
 * Result from a doctor check.
 *
 * @category Commands
 * @public
 */
export interface DoctorCheckResult {
	readonly key: string;
	readonly label: string;
	readonly status: DoctorStatus;
	readonly message: string;
}

interface DoctorDependencies {
	readonly loadWPKernelConfig: typeof loadWPKernelConfig;
	readonly buildWorkspace: typeof buildWorkspace;
	readonly buildReporter: typeof buildReporter;
	readonly buildReadinessRegistry: typeof buildDefaultReadinessRegistry;
}

/**
 * Options for building the `doctor` command, allowing for dependency injection.
 *
 * @category Commands
 */
export interface BuildDoctorCommandOptions {
	/** Optional: Custom function to load the WPKernel configuration. */
	readonly loadWPKernelConfig?: typeof loadWPKernelConfig;
	/** Optional: Custom workspace builder function. */
	readonly buildWorkspace?: typeof buildWorkspace;
	/** Optional: Custom reporter builder function. */
	readonly buildReporter?: typeof buildReporter;
	/** Optional: Custom readiness registry builder. */
	readonly buildReadinessRegistry?: typeof buildDefaultReadinessRegistry;
}

const DOCTOR_READINESS_OVERRIDES: DefaultReadinessHelperOverrides = {
	composer: { installOnPending: false },
};

const buildDoctorReadinessRegistry: typeof buildDefaultReadinessRegistry = (
	options?: BuildDefaultReadinessRegistryOptions
) => {
	const helperOverrides = {
		...options?.helperOverrides,
		composer: {
			...DOCTOR_READINESS_OVERRIDES.composer,
			...options?.helperOverrides?.composer,
		},
	};

	return buildDefaultReadinessRegistry({
		...(options ?? {}),
		helperOverrides,
	});
};

function mergeDependencies(
	options: BuildDoctorCommandOptions
): DoctorDependencies {
	return {
		loadWPKernelConfig: options.loadWPKernelConfig ?? loadWPKernelConfig,
		buildWorkspace: options.buildWorkspace ?? buildWorkspace,
		buildReporter: options.buildReporter ?? buildReporter,
		buildReadinessRegistry:
			options.buildReadinessRegistry ?? buildDoctorReadinessRegistry,
	} satisfies DoctorDependencies;
}

const DOCTOR_READINESS_KEYS: ReadonlyArray<ReadinessKey> = [
	'workspace-hygiene',
	'composer',
	'php-runtime',
	'php-driver',
	'php-printer-path',
];

const READINESS_LABELS: Record<ReadinessKey, string> = {
	'workspace-hygiene': 'Workspace hygiene',
	composer: 'Composer dependencies',
	'php-runtime': 'PHP runtime',
	'php-driver': 'PHP driver',
	'php-printer-path': 'PHP printer path',
	'release-pack': 'Release pack chain',
	'bootstrapper-resolution': 'Bootstrapper resolution',
	git: 'Git repository',
	'tsx-runtime': 'TSX runtime',
	quickstart: 'Quickstart scaffold',
};

const DEFAULT_STATUS_MAPPING: Record<ReadinessOutcomeStatus, DoctorStatus> = {
	ready: 'pass',
	updated: 'pass',
	pending: 'warn',
	blocked: 'warn',
	failed: 'fail',
};

const STATUS_OVERRIDES: Partial<
	Record<ReadinessKey, Partial<Record<ReadinessOutcomeStatus, DoctorStatus>>>
> = {
	'php-driver': {
		pending: 'fail',
		blocked: 'fail',
	},
};

function mapReadinessStatus(
	key: ReadinessKey,
	status: ReadinessOutcomeStatus
): DoctorStatus {
	const override = STATUS_OVERRIDES[key]?.[status];
	if (override) {
		return override;
	}

	return DEFAULT_STATUS_MAPPING[status] ?? 'warn';
}

function mapReadinessOutcome(outcome: ReadinessOutcome): DoctorCheckResult {
	const label = READINESS_LABELS[outcome.key] ?? `Readiness: ${outcome.key}`;
	const message =
		outcome.confirmation?.message ??
		outcome.detection?.message ??
		'Readiness helper produced no message.';

	return {
		key: `readiness:${outcome.key}`,
		label,
		status: mapReadinessStatus(outcome.key, outcome.status),
		message,
	} satisfies DoctorCheckResult;
}

function buildReadinessContext({
	reporter,
	workspace,
	workspaceRoot,
	cwd,
}: {
	reporter: Reporter;
	workspace: Workspace | null;
	workspaceRoot: string | null;
	cwd: string;
}): DxContext {
	return {
		reporter,
		workspace,
		environment: {
			cwd,
			projectRoot: getCliPackageRoot(),
			workspaceRoot,
		},
	} satisfies DxContext;
}

function buildReporterNamespace(): string {
	return `${WPK_NAMESPACE}.cli.doctor`;
}

/**
 * Builds the `doctor` command for the CLI.
 *
 * This command runs various health checks for the WPKernel project,
 * including configuration, Composer autoloading, PHP tooling, and workspace hygiene.
 *
 * @category Commands
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
			const cwd = resolveCommandCwd(this.context);

			const configResult = await this.checkWPKernelConfig({
				reporter,
				deps: dependencies,
			});
			results.push(configResult.result);

			const { loadedConfig, workspace, workspaceRoot } = configResult;

			if (loadedConfig) {
				results.push(
					this.describeComposerCheck(
						loadedConfig,
						reporter.child('composer')
					)
				);
			}

			const readinessResults = await this.runReadiness({
				deps: dependencies,
				reporter: reporter.child('readiness'),
				workspace,
				workspaceRoot,
				cwd,
			});
			results.push(...readinessResults);

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
			workspaceRoot: string | null;
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
					workspaceRoot,
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
					workspaceRoot: null,
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

		private async runReadiness({
			deps,
			reporter,
			workspace,
			workspaceRoot,
			cwd,
		}: {
			deps: DoctorDependencies;
			reporter: Reporter;
			workspace: Workspace | null;
			workspaceRoot: string | null;
			cwd: string;
		}): Promise<DoctorCheckResult[]> {
			const keys = this.resolveReadinessKeys();
			if (keys.length === 0) {
				return [];
			}

			const registry = deps.buildReadinessRegistry();
			const plan = registry.plan(keys);
			const context = buildReadinessContext({
				reporter,
				workspace,
				workspaceRoot,
				cwd,
			});
			const result = await plan.run(context);

			if (result.error) {
				throw result.error;
			}

			return result.outcomes.map(mapReadinessOutcome);
		}

		private resolveReadinessKeys(): ReadonlyArray<ReadinessKey> {
			const allowed = new Set(DOCTOR_READINESS_KEYS);
			return DEFAULT_READINESS_ORDER.filter((key) => allowed.has(key));
		}
	}

	return NextDoctorCommand;
}

/**
 * Renders a summary of the doctor check results for display in the CLI.
 *
 * @category Commands
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
