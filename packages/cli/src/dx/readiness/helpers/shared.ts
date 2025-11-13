import type { DxContext } from '../../context';

export function resolveWorkspaceRoot(context: DxContext): string {
	return (
		context.environment.workspaceRoot ??
		context.workspace?.root ??
		context.environment.cwd
	);
}
