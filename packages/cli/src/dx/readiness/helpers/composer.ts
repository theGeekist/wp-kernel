import { execFile as execFileCallback } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { EnvironmentalError } from '@wpkernel/core/error';
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
}

export interface ComposerHelperOverrides
	extends Partial<ComposerHelperDependencies> {
	readonly installOnPending?: boolean;
}

export interface ComposerReadinessState {
	readonly workspace: Workspace | null;
	readonly workspaceRoot: string;
	readonly vendorDirectory: string;
	readonly vendorPreviouslyExisted: boolean;
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

		if (!workspace) {
			return {
				status: 'blocked',
				state: {
					workspace: null,
					workspaceRoot,
					vendorDirectory,
					vendorPreviouslyExisted: false,
				},
				message:
					'Workspace not resolved; composer install unavailable.',
			};
		}

		const hasComposerManifest = await workspace.exists('composer.json');
		if (!hasComposerManifest) {
			return {
				status: 'blocked',
				state: {
					workspace,
					workspaceRoot,
					vendorDirectory,
					vendorPreviouslyExisted: false,
				},
				message:
					'composer.json missing. Run composer init or add manifest.',
			};
		}

		const autoloadPath = path.join('vendor', 'autoload.php');
		const hasAutoload = await workspace.exists(autoloadPath);

		if (hasAutoload) {
			await ensurePhpParserMetadata(workspaceRoot, dependencies);
		}
		return {
			status: hasAutoload ? 'ready' : 'pending',
			state: {
				workspace,
				workspaceRoot,
				vendorDirectory,
				vendorPreviouslyExisted: hasAutoload,
			},
			message: hasAutoload
				? 'Composer autoload detected.'
				: 'Install composer dependencies.',
		};
	}

	async function confirm(
		_context: DxContext,
		state: ComposerReadinessState
	): Promise<ReadinessConfirmation<ComposerReadinessState>> {
		const hasAutoload = state.workspace
			? await state.workspace.exists(path.join('vendor', 'autoload.php'))
			: false;

		return {
			status: hasAutoload ? 'ready' : 'pending',
			state,
			message: hasAutoload
				? 'Composer autoload ready.'
				: 'Composer autoload missing.',
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
