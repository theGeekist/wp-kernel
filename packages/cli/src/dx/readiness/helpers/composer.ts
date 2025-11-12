import fs from 'node:fs/promises';
import { execFile as execFileCallback } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { EnvironmentalError } from '@wpkernel/core/error';
import { getCliPackageRoot } from '../../../utils/module-url';
import { createReadinessHelper } from '../helper';
import type { ReadinessDetection, ReadinessConfirmation } from '../types';
import type { DxContext } from '../../context';
import { resolveWorkspaceRoot } from './shared';
import {
	installComposerDependencies,
	type InstallerDependencies,
} from '../../../commands/init/installers';
import type { Workspace } from '../../../workspace';

const execFile = promisify(execFileCallback) as (
	file: string,
	args: readonly string[],
	options: { cwd: string; encoding: BufferEncoding }
) => Promise<{ stdout: string; stderr: string }>;

interface ComposerShowResult {
	readonly stdout: string;
	readonly stderr: string;
}

interface ComposerPackageMetadata {
	readonly name?: string;
	readonly autoload?: Record<string, unknown>;
	readonly installed?: ReadonlyArray<{
		readonly name?: string;
		readonly autoload?: Record<string, unknown>;
	}>;
}

interface ComposerShowError extends NodeJS.ErrnoException {
	readonly stdout?: string | Buffer;
	readonly stderr?: string | Buffer;
}

export interface ComposerHelperDependencies {
	readonly install: typeof installComposerDependencies;
	readonly showPhpParserMetadata: (
		cwd: string
	) => Promise<ComposerShowResult>;
	readonly resolveCliComposerRoot: () => string | null;
	readonly pathExists: (candidate: string) => Promise<boolean>;
}

export interface ComposerHelperOverrides
	extends Partial<ComposerHelperDependencies> {
	readonly installOnPending?: boolean;
}

type AutoloadSource = 'workspace' | 'cli' | null;

export interface ComposerReadinessState {
	readonly workspace: Workspace | null;
	readonly workspaceRoot: string;
	readonly vendorDirectory: string;
	readonly vendorPreviouslyExisted: boolean;
	readonly resolvedAutoloadPath: string | null;
	readonly resolvedAutoloadSource: AutoloadSource;
}

function defaultDependencies(): ComposerHelperDependencies {
	return {
		install: (cwd: string, deps?: InstallerDependencies) =>
			installComposerDependencies(cwd, deps),
		showPhpParserMetadata: (cwd: string) =>
			execFile(
				'composer',
				['show', 'nikic/php-parser', '--format=json'],
				{
					cwd,
					encoding: 'utf8',
				}
			),
		resolveCliComposerRoot: () => {
			try {
				return getCliPackageRoot();
			} catch (_error) {
				return null;
			}
		},
		pathExists: async (candidate: string) => {
			try {
				await fs.access(candidate);
				return true;
			} catch (error) {
				if (
					error &&
					typeof error === 'object' &&
					'code' in (error as { code?: string }) &&
					(error as { code?: string }).code === 'ENOENT'
				) {
					return false;
				}

				throw error;
			}
		},
	} satisfies ComposerHelperDependencies;
}

function normaliseOutput(value: string | Buffer | undefined): string {
	if (typeof value === 'string') {
		return value;
	}

	if (Buffer.isBuffer(value)) {
		return value.toString('utf8');
	}

	return '';
}

function buildMetadataError(
	workspaceRoot: string,
	outputs: { stdout?: string; stderr?: string },
	message: string
): EnvironmentalError {
	return new EnvironmentalError('php.autoload.required', {
		message,
		data: {
			workspaceRoot,
			stdout: outputs.stdout ?? '',
			stderr: outputs.stderr ?? '',
		},
	});
}

function extractAutoload(
	metadata: ComposerPackageMetadata
): Record<string, unknown> | undefined {
	if (metadata.autoload) {
		return metadata.autoload;
	}

	if (Array.isArray(metadata.installed)) {
		for (const entry of metadata.installed) {
			if (entry?.name === 'nikic/php-parser' && entry.autoload) {
				return entry.autoload;
			}
		}
	}

	return undefined;
}

function isComposerShowError(error: unknown): error is ComposerShowError {
	return Boolean(
		error &&
			typeof error === 'object' &&
			('stdout' in (error as Record<string, unknown>) ||
				'stderr' in (error as Record<string, unknown>) ||
				'code' in (error as Record<string, unknown>))
	);
}

function hasAutoloadEntries(
	autoload: Record<string, unknown> | undefined
): boolean {
	if (!autoload) {
		return false;
	}

	return Object.values(autoload).some((value) => {
		if (Array.isArray(value)) {
			return value.length > 0;
		}

		if (value && typeof value === 'object') {
			return Object.keys(value as Record<string, unknown>).length > 0;
		}

		return Boolean(value);
	});
}

async function ensurePhpParserMetadata(
	workspaceRoot: string,
	dependencies: ComposerHelperDependencies
): Promise<void> {
	let result: ComposerShowResult;

	try {
		result = await dependencies.showPhpParserMetadata(workspaceRoot);
	} catch (error) {
		if (error instanceof EnvironmentalError) {
			throw error;
		}

		if (isComposerShowError(error)) {
			const failure = error as ComposerShowError;
			throw buildMetadataError(
				workspaceRoot,
				{
					stdout: normaliseOutput(failure.stdout),
					stderr: normaliseOutput(failure.stderr),
				},
				'composer show nikic/php-parser failed.'
			);
		}

		throw error;
	}

	let metadata: ComposerPackageMetadata;
	try {
		metadata = JSON.parse(result.stdout) as ComposerPackageMetadata;
	} catch (_error) {
		throw buildMetadataError(
			workspaceRoot,
			{
				stdout: result.stdout,
				stderr: result.stderr,
			},
			'composer show nikic/php-parser produced invalid JSON.'
		);
	}

	const autoload = extractAutoload(metadata);
	if (!hasAutoloadEntries(autoload)) {
		throw buildMetadataError(
			workspaceRoot,
			{
				stdout: result.stdout,
				stderr: result.stderr,
			},
			'nikic/php-parser autoload metadata missing.'
		);
	}
}

export function createComposerReadinessHelper(
	overrides: ComposerHelperOverrides = {}
) {
	const { installOnPending = true, ...dependencyOverrides } = overrides;
	const dependencies = {
		...defaultDependencies(),
		...dependencyOverrides,
	} satisfies ComposerHelperDependencies;

	async function detect(
		context: DxContext
	): Promise<ReadinessDetection<ComposerReadinessState>> {
		const workspace = context.workspace;
		const workspaceRoot = resolveWorkspaceRoot(context);
		const vendorDirectory = path.join(workspaceRoot, 'vendor');
		const autoloadRelativePath = path.join('vendor', 'autoload.php');

		if (!workspace) {
			return {
				status: 'blocked',
				state: {
					workspace: null,
					workspaceRoot,
					vendorDirectory,
					vendorPreviouslyExisted: false,
					resolvedAutoloadPath: null,
					resolvedAutoloadSource: null,
				},
				message:
					'Workspace not resolved; composer install unavailable.',
			};
		}

		const hasComposerManifest = await workspace.exists('composer.json');
		const cliComposerRoot = dependencies.resolveCliComposerRoot();
		const cliAutoloadPath = cliComposerRoot
			? path.join(cliComposerRoot, autoloadRelativePath)
			: null;
		const hasCliAutoload = cliAutoloadPath
			? await dependencies.pathExists(cliAutoloadPath)
			: false;

		if (!hasComposerManifest && !hasCliAutoload) {
			return {
				status: 'blocked',
				state: {
					workspace,
					workspaceRoot,
					vendorDirectory,
					vendorPreviouslyExisted: false,
					resolvedAutoloadPath: null,
					resolvedAutoloadSource: null,
				},
				message:
					'composer.json missing. Run composer init or add manifest.',
			};
		}

		const hasAutoload = await workspace.exists(autoloadRelativePath);

		if (hasAutoload) {
			await ensurePhpParserMetadata(workspaceRoot, dependencies);
			return {
				status: 'ready',
				state: {
					workspace,
					workspaceRoot,
					vendorDirectory,
					vendorPreviouslyExisted: hasAutoload,
					resolvedAutoloadPath:
						workspace.resolve(autoloadRelativePath),
					resolvedAutoloadSource: 'workspace',
				},
				message: 'Composer autoload detected.',
			};
		}

		if (hasCliAutoload && cliComposerRoot && cliAutoloadPath) {
			await ensurePhpParserMetadata(cliComposerRoot, dependencies);
			return {
				status: 'ready',
				state: {
					workspace,
					workspaceRoot,
					vendorDirectory,
					vendorPreviouslyExisted: false,
					resolvedAutoloadPath: cliAutoloadPath,
					resolvedAutoloadSource: 'cli',
				},
				message: 'CLI composer autoload detected.',
			};
		}

		return {
			status: 'pending',
			state: {
				workspace,
				workspaceRoot,
				vendorDirectory,
				vendorPreviouslyExisted: false,
				resolvedAutoloadPath: null,
				resolvedAutoloadSource: null,
			},
			message: 'Install composer dependencies.',
		};
	}

	async function confirm(
		_context: DxContext,
		state: ComposerReadinessState
	): Promise<ReadinessConfirmation<ComposerReadinessState>> {
		if (state.resolvedAutoloadSource === 'cli') {
			const autoloadPath = state.resolvedAutoloadPath;
			const exists = autoloadPath
				? await dependencies.pathExists(autoloadPath)
				: false;
			const message = exists
				? 'CLI composer autoload ready.'
				: 'CLI composer autoload missing.';

			return {
				status: exists ? 'ready' : 'pending',
				state,
				message,
			};
		}

		const exists = state.workspace
			? await state.workspace.exists(path.join('vendor', 'autoload.php'))
			: false;
		const message = exists
			? 'Composer autoload ready.'
			: 'Composer autoload missing.';

		return {
			status: exists ? 'ready' : 'pending',
			state,
			message,
		};
	}

	if (installOnPending) {
		return createReadinessHelper<ComposerReadinessState>({
			key: 'composer',
			detect,
			async execute(_context: DxContext, state: ComposerReadinessState) {
				if (!state.workspace) {
					return { state };
				}

				await dependencies.install(state.workspace.root);

				return {
					state,
					cleanup: state.vendorPreviouslyExisted
						? undefined
						: () =>
								state.workspace?.rm('vendor', {
									recursive: true,
								}),
				};
			},
			confirm,
		});
	}

	return createReadinessHelper<ComposerReadinessState>({
		key: 'composer',
		detect,
		confirm,
	});
}
