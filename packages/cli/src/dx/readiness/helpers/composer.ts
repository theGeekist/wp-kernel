import path from 'node:path';
import { createReadinessHelper } from '../helper';
import type { ReadinessDetection, ReadinessConfirmation } from '../types';
import type { DxContext } from '../../context';
import {
	installComposerDependencies,
	type InstallerDependencies,
} from '../../../commands/init/installers';
import type { Workspace } from '../../../workspace';

export interface ComposerHelperDependencies {
	readonly install: typeof installComposerDependencies;
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
	} satisfies ComposerHelperDependencies;
}

function resolveWorkspaceRoot(context: DxContext): string {
	return (
		context.environment.workspaceRoot ??
		context.workspace?.root ??
		context.environment.cwd
	);
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

		const hasAutoload = await workspace.exists(
			path.join('vendor', 'autoload.php')
		);
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
