import type { Reporter } from '@wpkernel/core/reporter';
import type { Workspace } from '../workspace';

/**
 * Environment metadata shared with readiness helpers.
 */
export interface DxEnvironment {
	/** Directory where the CLI process was invoked. */
	readonly cwd: string;
	/** Absolute path to the CLI package root. */
	readonly projectRoot: string;
	/**
	 * Resolved workspace root for the current command. `null` when the
	 * command operates outside of a project workspace (for example, prior
	 * to scaffolding).
	 */
	readonly workspaceRoot: string | null;
	/**
	 * When true, readiness helpers should tolerate dirty workspaces. This
	 * is controlled by the shared `--allow-dirty` flag.
	 */
	readonly allowDirty: boolean;
}

/**
 * Context object threaded through DX readiness helpers.
 */
export interface DxContext {
	/** Reporter used to emit DX readiness diagnostics. */
	readonly reporter: Reporter;
	/** Current workspace instance if the command resolved one. */
	readonly workspace: Workspace | null;
	/** Environment metadata describing cwd, workspace root, and flags. */
	readonly environment: DxEnvironment;
}
