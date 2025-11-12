import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { EnvironmentalError, WPKernelError } from '@wpkernel/core/error';
import { serializeWPKernelError } from '@wpkernel/core/contracts';
import { createReadinessHelper } from '../helper';
import { createModuleResolver } from '../../../utils/module-url';
import type { ReadinessDetection, ReadinessConfirmation } from '../types';
import type { DxContext } from '../../context';
import type { Workspace } from '../../../workspace';
import { buildResolvePaths, resolveWorkspaceRoot } from './shared';

const execFile = promisify(execFileCallback);

export interface TsxRuntimeDependencies {
	readonly resolve: (id: string, opts?: { paths?: string[] }) => string;
	readonly exec: typeof execFile;
}

export interface TsxRuntimeState {
	readonly workspace: Workspace | null;
	readonly workspaceRoot: string;
	readonly resolvedPath: string | null;
	readonly missingError: WPKernelError | null;
	readonly installedDuringRun: boolean;
}

interface TsxResolutionResult {
	readonly resolvedPath: string | null;
	readonly error: WPKernelError | null;
}

function defaultDependencies(): TsxRuntimeDependencies {
	return {
		resolve: createModuleResolver(),
		exec: execFile,
	} satisfies TsxRuntimeDependencies;
}

function createModuleNotFoundMessage(paths: readonly string[]): string {
	if (paths.length === 0) {
		return 'tsx runtime missing; no module resolution paths available.';
	}

	return `tsx runtime missing from ${paths.join(', ')}.`;
}

function isModuleNotFoundError(
	error: unknown
): error is NodeJS.ErrnoException & {
	code: 'MODULE_NOT_FOUND';
	message: string;
} {
	return (
		Boolean(error && typeof error === 'object') &&
		'code' in (error as { code?: unknown }) &&
		(error as { code?: unknown }).code === 'MODULE_NOT_FOUND' &&
		typeof (error as { message?: unknown }).message === 'string'
	);
}

function isTsxModuleMissing(
	error: NodeJS.ErrnoException & {
		code: 'MODULE_NOT_FOUND';
		message: string;
	}
): boolean {
	const lower = error.message.toLowerCase();
	return (
		lower.includes("cannot find module 'tsx'") ||
		lower.includes("cannot find module 'tsx/esm/api'") ||
		lower.includes("can't resolve 'tsx'") ||
		lower.includes('module "tsx"')
	);
}

async function resolveTsx(
	dependencies: TsxRuntimeDependencies,
	context: DxContext
): Promise<TsxResolutionResult> {
	const paths = buildResolvePaths(context, [
		'workspace',
		'environmentWorkspace',
		'project',
	]);

	try {
		const resolved = dependencies.resolve('tsx/esm/api', { paths });
		return { resolvedPath: resolved, error: null };
	} catch (error) {
		if (isModuleNotFoundError(error) && isTsxModuleMissing(error)) {
			return {
				resolvedPath: null,
				error: new EnvironmentalError('tsx.missing', {
					message: createModuleNotFoundMessage(paths),
					data: {
						paths,
						message: error.message,
					},
				}),
			} satisfies TsxResolutionResult;
		}

		const underlying = error instanceof Error ? error : undefined;
		const data = underlying
			? { paths, originalError: underlying }
			: { paths };
		return {
			resolvedPath: null,
			error: new WPKernelError('DeveloperError', {
				message: 'Failed to resolve tsx runtime via CLI loader.',
				data,
			}),
		} satisfies TsxResolutionResult;
	}
}

async function installTsx(
	dependencies: TsxRuntimeDependencies,
	workspaceRoot: string
): Promise<void> {
	await dependencies.exec('npm', ['install', '--save-dev', 'tsx'], {
		cwd: workspaceRoot,
	});
}

async function uninstallTsx(
	dependencies: TsxRuntimeDependencies,
	workspaceRoot: string
): Promise<void> {
	await dependencies.exec('npm', ['uninstall', '--save-dev', 'tsx'], {
		cwd: workspaceRoot,
	});
}

export function createTsxRuntimeReadinessHelper(
	overrides: Partial<TsxRuntimeDependencies> = {}
) {
	const dependencies = { ...defaultDependencies(), ...overrides };

	return createReadinessHelper<TsxRuntimeState>({
		key: 'tsx-runtime',
		async detect(context): Promise<ReadinessDetection<TsxRuntimeState>> {
			const workspaceRoot = resolveWorkspaceRoot(context);
			const { resolvedPath, error } = await resolveTsx(
				dependencies,
				context
			);
			const workspace = context.workspace ?? null;

			if (!error && resolvedPath) {
				context.reporter.info('tsx runtime available.', {
					path: resolvedPath,
				});
				return {
					status: 'ready',
					state: {
						workspace,
						workspaceRoot,
						resolvedPath,
						missingError: null,
						installedDuringRun: false,
					},
					message: `tsx runtime resolved at ${resolvedPath}.`,
				} satisfies ReadinessDetection<TsxRuntimeState>;
			}

			if (!workspace) {
				if (error) {
					context.reporter.error(
						'tsx runtime unavailable and no workspace to install into.',
						{
							error: serializeWPKernelError(error),
							workspaceRoot,
						}
					);
				}

				return {
					status: 'blocked',
					state: {
						workspace,
						workspaceRoot,
						resolvedPath,
						missingError: error,
						installedDuringRun: false,
					},
					message:
						error?.message ??
						'tsx runtime unavailable without workspace context.',
				} satisfies ReadinessDetection<TsxRuntimeState>;
			}

			if (error instanceof EnvironmentalError) {
				context.reporter.warn(
					'tsx runtime missing; installing dependency.',
					{
						error: serializeWPKernelError(error),
						workspaceRoot,
					}
				);

				return {
					status: 'pending',
					state: {
						workspace,
						workspaceRoot,
						resolvedPath,
						missingError: error,
						installedDuringRun: false,
					},
					message: error.message,
				} satisfies ReadinessDetection<TsxRuntimeState>;
			}

			const blockingError =
				error ??
				new WPKernelError('DeveloperError', {
					message: 'tsx runtime probe failed with unknown error.',
					data: { workspaceRoot },
				});

			context.reporter.error('tsx runtime probe failed.', {
				error: serializeWPKernelError(blockingError),
				workspaceRoot,
			});

			return {
				status: 'blocked',
				state: {
					workspace,
					workspaceRoot,
					resolvedPath,
					missingError: blockingError,
					installedDuringRun: false,
				},
				message: blockingError.message,
			} satisfies ReadinessDetection<TsxRuntimeState>;
		},
		async execute(context, state) {
			if (!state.workspace) {
				return { state };
			}

			await installTsx(dependencies, state.workspace.root);

			context.reporter.info('Installed tsx runtime dependency.', {
				workspaceRoot: state.workspace.root,
			});

			const probe = await resolveTsx(dependencies, context);

			const nextState: TsxRuntimeState = {
				workspace: state.workspace,
				workspaceRoot: state.workspaceRoot,
				resolvedPath: probe.resolvedPath ?? state.resolvedPath,
				missingError: probe.error,
				installedDuringRun: true,
			};

			return {
				state: nextState,
				cleanup: state.resolvedPath
					? undefined
					: () =>
							state.workspace
								? uninstallTsx(
										dependencies,
										state.workspace.root
									)
								: undefined,
			};
		},
		async confirm(
			context,
			state
		): Promise<ReadinessConfirmation<TsxRuntimeState>> {
			const probe = await resolveTsx(dependencies, context);
			const status = probe.resolvedPath ? 'ready' : 'pending';
			const message = probe.resolvedPath
				? `tsx runtime available at ${probe.resolvedPath}.`
				: (probe.error?.message ?? 'tsx runtime still missing.');

			if (!probe.resolvedPath && probe.error) {
				context.reporter.error('tsx runtime confirmation failed.', {
					error: serializeWPKernelError(probe.error),
					workspaceRoot: state.workspaceRoot,
				});
			}

			return {
				status,
				state: {
					workspace: state.workspace,
					workspaceRoot: state.workspaceRoot,
					resolvedPath: probe.resolvedPath,
					missingError: probe.error,
					installedDuringRun: state.installedDuringRun,
				},
				message,
			} satisfies ReadinessConfirmation<TsxRuntimeState>;
		},
	});
}
