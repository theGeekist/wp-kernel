import { createReadinessHelper } from '../helper';
import type {
	ReadinessDetection,
	ReadinessConfirmation,
	ReadinessHelper,
} from '../types';
import type { DxContext } from '../../context';
import {
	ensureGeneratedPhpClean,
	type EnsureGeneratedPhpCleanOptions,
	type Workspace,
} from '../../../workspace';
import { resolveWorkspaceRoot } from './shared';

export interface WorkspaceHygieneDependencies {
	readonly ensureClean: typeof ensureGeneratedPhpClean;
}

export interface WorkspaceHygieneState {
	readonly workspace: Workspace | null;
	readonly workspaceRoot: string;
}

function defaultDependencies(): WorkspaceHygieneDependencies {
	return {
		ensureClean: (options: EnsureGeneratedPhpCleanOptions) =>
			ensureGeneratedPhpClean(options),
	} satisfies WorkspaceHygieneDependencies;
}

async function verifyClean(
	dependencies: WorkspaceHygieneDependencies,
	workspace: Workspace,
	reporter: DxContext['reporter']
): Promise<void> {
	await dependencies.ensureClean({ workspace, reporter, yes: false });
}

export function createWorkspaceHygieneReadinessHelper(
	overrides: Partial<WorkspaceHygieneDependencies> = {}
): ReadinessHelper<WorkspaceHygieneState> {
	const dependencies = { ...defaultDependencies(), ...overrides };

	return createReadinessHelper<WorkspaceHygieneState>({
		key: 'workspace-hygiene',
		metadata: {
			label: 'Workspace hygiene',
			description:
				'Verifies the workspace is clean before scaffolding or running doctor checks.',
			tags: ['workspace', 'scaffold'],
			scopes: ['create', 'init', 'doctor'],
			order: 10,
		},
		async detect(
			context
		): Promise<ReadinessDetection<WorkspaceHygieneState>> {
			const workspace = context.workspace;
			const workspaceRoot = resolveWorkspaceRoot(context);

			if (!workspace) {
				return {
					status: 'blocked',
					state: { workspace: null, workspaceRoot },
					message:
						'Workspace not resolved; hygiene check unavailable.',
				};
			}

			try {
				await verifyClean(dependencies, workspace, context.reporter);
				return {
					status: 'ready',
					state: { workspace, workspaceRoot },
					message: 'Generated PHP directory clean.',
				};
			} catch (_error) {
				return {
					status: 'blocked',
					state: { workspace, workspaceRoot },
					message: 'Generated PHP directory has pending changes.',
				};
			}
		},
		async confirm(
			context,
			state
		): Promise<ReadinessConfirmation<WorkspaceHygieneState>> {
			if (!state.workspace) {
				return {
					status: 'pending',
					state,
					message: 'Workspace missing; hygiene unresolved.',
				};
			}

			try {
				await verifyClean(
					dependencies,
					state.workspace,
					context.reporter
				);
				return {
					status: 'ready',
					state,
					message: 'Workspace hygiene confirmed.',
				};
			} catch (_error) {
				return {
					status: 'pending',
					state,
					message: 'Workspace hygiene still failing.',
				};
			}
		},
	});
}
