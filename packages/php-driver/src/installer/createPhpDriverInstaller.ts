import { promisify } from 'node:util';
import { execFile, type ExecFileOptions } from 'node:child_process';
import { KernelError } from '@wpkernel/core/error';
import type { WorkspaceLike } from '../workspace';

const REQUIRED_PACKAGE = 'nikic/php-parser';
const VENDOR_AUTOLOAD = 'vendor/autoload.php';
const COMPOSER_MANIFEST = 'composer.json';

type ExecFileResult = { stdout: string | Buffer; stderr: string | Buffer };

type ExecFileFn = (
	command: string,
	args: readonly string[],
	options: ExecFileOptions
) => Promise<ExecFileResult>;

let cachedExecFileAsync: ExecFileFn | null = null;

function resolveExecFile(configExec?: ExecFileFn): ExecFileFn {
	if (configExec) {
		return configExec;
	}

	if (!cachedExecFileAsync) {
		if (typeof execFile !== 'function') {
			throw new KernelError('DeveloperError', {
				message: 'Composer install support is unavailable.',
			});
		}

		cachedExecFileAsync = promisify(execFile);
	}

	return cachedExecFileAsync;
}

export interface PhpDriverInstallLogger {
	info?: (message: string, context?: unknown) => void;
	debug?: (message: string, context?: unknown) => void;
	error?: (message: string, context?: unknown) => void;
}

export interface PhpDriverInstallerConfig {
	readonly composerBinary?: string;
	readonly installArgs?: readonly string[];
	readonly exec?: ExecFileFn;
}

export interface PhpDriverInstallOptions {
	readonly workspace: WorkspaceLike;
	readonly logger?: PhpDriverInstallLogger;
}

export type PhpDriverInstallSkipReason =
	| 'missing-manifest'
	| 'already-installed';

export interface PhpDriverInstallResult {
	readonly installed: boolean;
	readonly skippedReason?: PhpDriverInstallSkipReason;
}

export interface PhpDriverInstaller {
	install: (
		options: PhpDriverInstallOptions
	) => Promise<PhpDriverInstallResult>;
}

export function createPhpDriverInstaller(
	config: PhpDriverInstallerConfig = {}
): PhpDriverInstaller {
	const {
		composerBinary = 'composer',
		installArgs = ['install'],
		exec,
	} = config;

	return {
		async install(options: PhpDriverInstallOptions) {
			const { workspace, logger } = options;
			const skipReason = await detectSkipReason(workspace, logger);

			if (skipReason) {
				return {
					installed: false,
					skippedReason: skipReason,
				};
			}

			logger?.info?.(
				`Installing ${REQUIRED_PACKAGE} via composer (${composerBinary} ${installArgs.join(' ')}).`
			);

			try {
				const execFn = resolveExecFile(exec);
				await execFn(composerBinary, installArgs, {
					cwd: workspace.root,
				});
			} catch (error) {
				logger?.error?.(
					`Composer install failed while fetching ${REQUIRED_PACKAGE}.`,
					{ error }
				);
				throw new KernelError('DeveloperError', {
					message: 'Composer install failed.',
					data:
						error instanceof Error
							? { message: error.message }
							: undefined,
				});
			}

			logger?.info?.(`${REQUIRED_PACKAGE} installed successfully.`);

			return { installed: true };
		},
	};
}

async function detectSkipReason(
	workspace: WorkspaceLike,
	logger?: PhpDriverInstallLogger
): Promise<PhpDriverInstallSkipReason | null> {
	const manifestPath = workspace.resolve(COMPOSER_MANIFEST);
	const hasComposerManifest = await workspace.exists(manifestPath);

	if (!hasComposerManifest) {
		logger?.debug?.(
			'createPhpDriverInstaller: composer.json missing, skipping installer.'
		);
		return 'missing-manifest';
	}

	const vendorAutoloadPath = workspace.resolve(VENDOR_AUTOLOAD);
	const hasVendorAutoload = await workspace.exists(vendorAutoloadPath);

	if (hasVendorAutoload) {
		logger?.debug?.('PHP parser dependency detected via composer.');
		return 'already-installed';
	}

	return null;
}
