import type { Reporter } from '@wpkernel/core/reporter';
import type { Workspace } from '@wpkernel/cli/workspace';

export interface ReadinessEnvironment {
	readonly cwd: string;
	readonly projectRoot: string;
	readonly workspaceRoot: string | null;
	readonly allowDirty: boolean;
}

export interface DxContext {
	readonly reporter: Reporter;
	readonly workspace: Workspace | null;
	readonly environment: ReadinessEnvironment;
}
