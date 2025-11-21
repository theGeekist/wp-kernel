import { createReadinessHelper } from '../helper';
import type {
	ReadinessDetection,
	ReadinessConfirmation,
	ReadinessHelper,
} from '../types';
import {
	readWorkspaceGitStatus,
	type Workspace,
	type WorkspaceGitStatus,
} from '../../../workspace';
import { resolveWorkspaceRoot } from './shared';

export interface WorkspaceHygieneDependencies {
	readonly readGitStatus: typeof readWorkspaceGitStatus;
}

export interface WorkspaceHygieneState {
	readonly workspace: Workspace | null;
	readonly workspaceRoot: string;
	readonly gitStatus: WorkspaceGitStatus | null;
	readonly gitRepositoryDetected: boolean;
	readonly allowDirty: boolean;
}

function defaultDependencies(): WorkspaceHygieneDependencies {
	return {
		readGitStatus: (workspace: Workspace) =>
			readWorkspaceGitStatus(workspace),
	} satisfies WorkspaceHygieneDependencies;
}

function formatDirtyMessage(entries: WorkspaceGitStatus): string {
	const count = entries.length;
	if (count === 1) {
		return `Workspace has ${count} pending change.`;
	}

	return `Workspace has ${count} pending changes.`;
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
			scopes: ['create', 'init', 'generate', 'apply', 'doctor'],
			order: 10,
		},
		async detect(
			context
		): Promise<ReadinessDetection<WorkspaceHygieneState>> {
			const workspace = context.workspace;
			const workspaceRoot = resolveWorkspaceRoot(context);
			const allowDirty = context.environment.allowDirty === true;

			if (!workspace) {
				return {
					status: 'blocked',
					state: {
						workspace: null,
						workspaceRoot,
						gitStatus: null,
						gitRepositoryDetected: false,
						allowDirty,
					},
					message:
						'Workspace not resolved; hygiene check unavailable.',
				};
			}

			const gitStatus = await dependencies.readGitStatus(workspace);

			if (!gitStatus) {
				return {
					status: 'ready',
					state: {
						workspace,
						workspaceRoot,
						gitStatus: null,
						gitRepositoryDetected: false,
						allowDirty,
					},
					message:
						'Git repository not detected; skipping workspace hygiene.',
				};
			}

			if (gitStatus.length === 0) {
				return {
					status: 'ready',
					state: {
						workspace,
						workspaceRoot,
						gitStatus,
						gitRepositoryDetected: true,
						allowDirty,
					},
					message:
						'Workspace hygiene check found no pending changes.',
				};
			}

			if (!allowDirty) {
				return {
					status: 'blocked',
					state: {
						workspace,
						workspaceRoot,
						gitStatus,
						gitRepositoryDetected: true,
						allowDirty,
					},
					message: `${formatDirtyMessage(gitStatus)} Commit, stash, or re-run with --allow-dirty to continue.`,
				};
			}

			return {
				status: 'pending',
				state: {
					workspace,
					workspaceRoot,
					gitStatus,
					gitRepositoryDetected: true,
					allowDirty,
				},
				message: `${formatDirtyMessage(gitStatus)} (--allow-dirty applied).`,
			};
		},
		async confirm(
			_context,
			state
		): Promise<ReadinessConfirmation<WorkspaceHygieneState>> {
			if (!state.workspace) {
				return {
					status: 'pending',
					state,
					message: 'Workspace missing; hygiene unresolved.',
				};
			}

			const gitStatus = await dependencies.readGitStatus(state.workspace);

			if (!gitStatus) {
				return {
					status: 'ready',
					state: {
						...state,
						gitStatus: null,
						gitRepositoryDetected: false,
					},
					message:
						'Workspace hygiene skipped (git repository not detected).',
				};
			}

			if (gitStatus.length === 0) {
				return {
					status: 'ready',
					state: {
						...state,
						gitStatus,
						gitRepositoryDetected: true,
					},
					message: 'Workspace hygiene check completed.',
				};
			}

			return {
				status: 'ready',
				state: {
					...state,
					gitStatus,
					gitRepositoryDetected: true,
				},
				message: `${formatDirtyMessage(gitStatus)} (allowed).`,
			};
		},
		async execute(context, state) {
			if (
				!state.workspace ||
				!state.gitStatus ||
				state.gitStatus.length === 0
			) {
				return { state };
			}

			context.reporter.info(
				'Workspace hygiene recorded pending changes.',
				{
					entries: state.gitStatus.map((entry) => entry.raw),
				}
			);

			return { state };
		},
	});
}
