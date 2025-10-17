import type { WorkspaceOptions } from '../../../../tests/workspace.test-support';
import { withWorkspace as withTestWorkspace } from '../../../../tests/workspace.test-support';
import { createWorkspace } from '../../workspace';
import type { Workspace } from '../../workspace/types';

export interface BuilderWorkspaceContext {
	readonly root: string;
	readonly workspace: Workspace;
}

export type BuilderWorkspaceOptions = WorkspaceOptions;

export async function withBuilderWorkspace(
	run: (context: BuilderWorkspaceContext) => Promise<void>,
	options: BuilderWorkspaceOptions = {}
): Promise<void> {
	await withTestWorkspace(
		async (workspaceRoot) => {
			const workspace = createWorkspace(workspaceRoot);
			await run({ root: workspaceRoot, workspace });
		},
		{
			chdir: false,
			...options,
		}
	);
}
