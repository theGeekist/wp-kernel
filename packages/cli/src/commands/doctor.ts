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
	type BuildDefaultReadinessRegistryOptions,
	type DefaultReadinessHelperOverrides,
	type DxContext,
	type ReadinessHelperDescriptor,
	type ReadinessKey,
	type ReadinessOutcome,
	type ReadinessOutcomeStatus,
} from '../dx';
import { getCliPackageRoot } from '../utils/module-url';
import { resolveCommandCwd } from './init/command-runtime';
import { runWithProgress, formatDuration } from '../utils/progress';
import { COMMAND_HELP } from '../cli/help';

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

const DOCTOR_READINESS_OVERRIDES: DefaultReadinessHelperOverrides = {};

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
	'php-printer-path': {
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

function helperIncludesScope(
	helper: ReadinessHelperDescriptor,
	scope: string
): boolean {
	const scopes = helper.metadata.scopes;
	if (!scopes || scopes.length === 0) {
		return true;
	}

	return scopes.includes(scope);
}

function mapReadinessOutcome(
	outcome: ReadinessOutcome,
	helpers: Map<ReadinessKey, ReadinessHelperDescriptor>
): DoctorCheckResult {
	const helper = helpers.get(outcome.key);
	const label = helper?.metadata.label ?? `Readiness: ${outcome.key}`;
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
			allowDirty: false,
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
 * including configuration, bundled assets, PHP tooling, and workspace hygiene.
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
			description: COMMAND_HELP.doctor.description,
			details: COMMAND_HELP.doctor.details,
			examples: COMMAND_HELP.doctor.examples,
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

			const readinessResults = await this.runReadiness({
				deps: dependencies,
				reporter: reporter.child('readiness'),
				workspace,
				workspaceRoot,
				cwd,
				config: loadedConfig?.config ?? null,
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

		private async runReadiness({
			deps,
			reporter,
			workspace,
			workspaceRoot,
			cwd,
			config,
		}: {
			deps: DoctorDependencies;
			reporter: Reporter;
			workspace: Workspace | null;
			workspaceRoot: string | null;
			cwd: string;
			config: LoadedWPKernelConfig['config'] | null;
		}): Promise<DoctorCheckResult[]> {
			const registry = deps.buildReadinessRegistry({
				helperFactories: config?.readiness?.helpers,
			});
			const descriptors = registry.describe();
			const scoped = descriptors.filter((helper) =>
				helperIncludesScope(helper, 'doctor')
			);
			const keys = scoped.map((helper) => helper.key);
			if (keys.length === 0) {
				return [];
			}

			const helperLookup = new Map<
				ReadinessKey,
				ReadinessHelperDescriptor
			>(scoped.map((helper) => [helper.key, helper]));

			const plan = registry.plan(keys);
			const context = buildReadinessContext({
				reporter,
				workspace,
				workspaceRoot,
				cwd,
			});
			const { result: readinessResult } = await runWithProgress({
				reporter,
				label: 'Running doctor readiness checks',
				run: () => plan.run(context),
				successMessage: (durationMs) =>
					`✓ Doctor readiness completed in ${formatDuration(durationMs)}.`,
			});

			if (readinessResult.error) {
				throw readinessResult.error;
			}

			return readinessResult.outcomes.map((outcome) =>
				mapReadinessOutcome(outcome, helperLookup)
			);
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
