import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { createReadinessHelper } from '../helper';
import { createModuleResolver } from '../../../utils/module-url';
import type { ReadinessDetection, ReadinessConfirmation } from '../types';
import type { DxContext } from '../../context';
import type { Workspace } from '../../../workspace';

const execFile = promisify(execFileCallback);

export interface TsxRuntimeDependencies {
	readonly resolve: (id: string, opts?: { paths?: string[] }) => string;
	readonly exec: typeof execFile;
}

export interface TsxRuntimeState {
	readonly workspace: Workspace | null;
	readonly workspaceRoot: string;
	readonly resolvedPath: string | null;
}

function defaultDependencies(): TsxRuntimeDependencies {
	return {
		resolve: createModuleResolver(),
		exec: execFile,
	} satisfies TsxRuntimeDependencies;
}

function resolveWorkspaceRoot(context: DxContext): string {
	return (
		context.environment.workspaceRoot ??
		context.workspace?.root ??
		context.environment.cwd
	);
}

function buildResolvePaths(context: DxContext): string[] {
	const paths = new Set<string>();
	if (context.workspace) {
		paths.add(context.workspace.root);
	}
	if (context.environment.workspaceRoot) {
		paths.add(context.environment.workspaceRoot);
	}
	paths.add(context.environment.projectRoot);
	return Array.from(paths);
}

async function resolveTsx(
	dependencies: TsxRuntimeDependencies,
	context: DxContext
): Promise<string | null> {
	try {
		return dependencies.resolve('tsx', {
			paths: buildResolvePaths(context),
		});
	} catch {
		return null;
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
			const resolved = await resolveTsx(dependencies, context);

			return {
				status: resolved ? 'ready' : 'pending',
				state: {
					workspace: context.workspace ?? null,
					workspaceRoot,
					resolvedPath: resolved,
				},
				message: resolved
					? 'tsx runtime detected.'
					: 'tsx runtime missing from workspace.',
			};
		},
		async execute(_context, state) {
			if (!state.workspace) {
				return { state };
			}

			await installTsx(dependencies, state.workspace.root);

			return {
				state,
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
			const resolved = await resolveTsx(dependencies, context);

			return {
				status: resolved ? 'ready' : 'pending',
				state: {
					workspace: state.workspace,
					workspaceRoot: state.workspaceRoot,
					resolvedPath: resolved,
				},
				message: resolved
					? 'tsx runtime available.'
					: 'tsx runtime still missing.',
			};
		},
	});
}
