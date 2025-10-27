import path from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import { Command } from 'clipanion';
import { createReporter as defaultBuildReporter } from '@wpkernel/core/reporter';
import {
	WPK_NAMESPACE,
	WPK_EXIT_CODES,
	type WPKExitCode,
} from '@wpkernel/core/contracts';
import type { Reporter } from '@wpkernel/core/reporter';
import { serialiseError } from '../../commands/run-generate/reporting';
import { loadKernelConfig } from '../../config';
import type { LoadedKernelConfig } from '../../config/types';
import {
	buildWorkspace,
	ensureGeneratedPhpClean,
	type Workspace,
} from '../workspace';

const execFileAsync = promisify(execFile);

type DoctorCheckStatus = 'pass' | 'warn' | 'fail';

export interface DoctorCheckResult {
	readonly key: string;
	readonly status: DoctorCheckStatus;
	readonly message: string;
	readonly details?: Record<string, unknown>;
}

export interface BuildDoctorCommandOptions {
	readonly loadKernelConfig?: typeof loadKernelConfig;
	readonly buildWorkspace?: typeof buildWorkspace;
	readonly ensureGeneratedPhpClean?: typeof ensureGeneratedPhpClean;
	readonly checkPhpBinary?: () => Promise<void>;
	readonly buildReporter?: typeof defaultBuildReporter;
}

interface DoctorDependencies {
	readonly loadKernelConfig: typeof loadKernelConfig;
	readonly buildWorkspace: typeof buildWorkspace;
	readonly ensureGeneratedPhpClean: typeof ensureGeneratedPhpClean;
	readonly checkPhpBinary: () => Promise<void>;
	readonly buildReporter: typeof defaultBuildReporter;
}

function buildReporterNamespace(): string {
	return `${WPK_NAMESPACE}.cli.next.doctor`;
}

function mergeDependencies(
	options: BuildDoctorCommandOptions
): DoctorDependencies {
	return {
		loadKernelConfig,
		buildWorkspace,
		ensureGeneratedPhpClean,
		checkPhpBinary: defaultCheckPhpBinary,
		buildReporter: defaultBuildReporter,
		...options,
	} satisfies DoctorDependencies;
}

async function defaultCheckPhpBinary(): Promise<void> {
	await execFileAsync('php', ['-v']);
}

export function buildDoctorCommand(
	options: BuildDoctorCommandOptions = {}
): new () => Command & { results: DoctorCheckResult[] } {
	const dependencies = mergeDependencies(options);

	class NextDoctorCommand extends Command {
		static override paths = [['doctor']];

		static override usage = Command.Usage({
			description:
				'Run workspace health checks to validate configuration and tooling.',
		});

		public results: DoctorCheckResult[] = [];

		override async execute(): Promise<WPKExitCode> {
			const reporter = dependencies.buildReporter({
				namespace: buildReporterNamespace(),
				level: 'info',
				enabled: process.env.NODE_ENV !== 'test',
			});

			this.results = [];

			const loaded = await this.runConfigCheck(reporter);
			if (!loaded) {
				this.printSummary();
				return WPK_EXIT_CODES.VALIDATION_ERROR;
			}

			const workspaceRoot = resolveWorkspaceRoot(loaded);
			const workspace = dependencies.buildWorkspace(workspaceRoot);

			await this.runComposerCheck(workspaceRoot, reporter);
			await this.runPhpCheck(reporter);
			await this.runWorkspaceHygieneCheck(workspace, reporter);

			this.printSummary();

			const hasFailure = this.results.some(
				(result) => result.status === 'fail'
			);

			return hasFailure
				? WPK_EXIT_CODES.VALIDATION_ERROR
				: WPK_EXIT_CODES.SUCCESS;
		}

		private async runConfigCheck(
			reporter: Reporter
		): Promise<LoadedKernelConfig | null> {
			try {
				const loaded = await dependencies.loadKernelConfig();
				const message = `Kernel config loaded from ${loaded.configOrigin}.`;
				reporter.info(message, {
					source: toWorkspaceRelativePath(loaded.sourcePath),
					namespace: loaded.namespace,
				});
				this.results.push({
					key: 'kernel-config',
					status: 'pass',
					message,
				});
				return loaded;
			} catch (error) {
				const message = 'Failed to load kernel config.';
				reporter.error(message, serialiseError(error));
				this.results.push({
					key: 'kernel-config',
					status: 'fail',
					message,
					details: serialiseError(error),
				});
				return null;
			}
		}

		private async runComposerCheck(
			workspaceRoot: string,
			reporter: Reporter
		): Promise<void> {
			const composerPath = path.join(workspaceRoot, 'composer.json');
			const autoloadPath = path.join(
				workspaceRoot,
				'vendor',
				'autoload.php'
			);

			try {
				await fs.access(composerPath);
			} catch {
				const message =
					'composer.json not found. Ensure PSR-4 autoload mapping matches generated PHP.';
				reporter.warn(message, {
					composerPath: toWorkspaceRelativePath(composerPath),
				});
				this.results.push({
					key: 'composer',
					status: 'warn',
					message,
					details: {
						composerPath: toWorkspaceRelativePath(composerPath),
					},
				});
				return;
			}

			try {
				await fs.access(autoloadPath);
				const message =
					'Composer autoload detected (vendor/autoload.php).';
				reporter.info(message, {
					autoloadPath: toWorkspaceRelativePath(autoloadPath),
				});
				this.results.push({
					key: 'composer',
					status: 'pass',
					message,
					details: {
						autoloadPath: toWorkspaceRelativePath(autoloadPath),
					},
				});
			} catch {
				const message =
					'vendor/autoload.php missing. Run composer install to ensure PHP builder dependencies.';
				reporter.warn(message, {
					autoloadPath: toWorkspaceRelativePath(autoloadPath),
				});
				this.results.push({
					key: 'composer',
					status: 'warn',
					message,
					details: {
						autoloadPath: toWorkspaceRelativePath(autoloadPath),
					},
				});
			}
		}

		private async runPhpCheck(reporter: Reporter): Promise<void> {
			try {
				await dependencies.checkPhpBinary();
				const message = 'PHP binary available (php -v succeeded).';
				reporter.info(message);
				this.results.push({
					key: 'php-binary',
					status: 'pass',
					message,
				});
			} catch (error) {
				const message =
					'PHP binary check failed. Ensure php is on PATH.';
				reporter.error(message, serialiseError(error));
				this.results.push({
					key: 'php-binary',
					status: 'fail',
					message,
					details: serialiseError(error),
				});
			}
		}

		private async runWorkspaceHygieneCheck(
			workspace: Workspace,
			reporter: Reporter
		): Promise<void> {
			try {
				await dependencies.ensureGeneratedPhpClean({
					workspace,
					reporter: reporter.child('workspace'),
					yes: false,
				});
				const message =
					'Generated PHP directory is clean (git status empty).';
				reporter.info(message);
				this.results.push({
					key: 'workspace-hygiene',
					status: 'pass',
					message,
				});
			} catch (error) {
				const message =
					'Generated PHP directory has uncommitted changes.';
				reporter.error(message, serialiseError(error));
				this.results.push({
					key: 'workspace-hygiene',
					status: 'fail',
					message,
					details: serialiseError(error),
				});
			}
		}

		private printSummary(): void {
			const lines = ['Doctor summary:'];
			for (const result of this.results) {
				lines.push(`- [${result.status}] ${result.message}`);
			}

			this.context.stdout.write(`${lines.join('\n')}\n`);
		}
	}

	return NextDoctorCommand;
}

function resolveWorkspaceRoot(loaded: LoadedKernelConfig): string {
	return path.dirname(loaded.sourcePath);
}

function toWorkspaceRelativePath(absolute: string): string {
	const relative = path.relative(process.cwd(), absolute);
	return relative === '' ? '.' : relative.split(path.sep).join('/');
}
