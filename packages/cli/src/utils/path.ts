import { relative, resolve } from 'node:path';

/**
 * Resolve a path relative to the workspace root (process.cwd()).
 *
 * Useful when a CLI operation needs to convert a logical segment list into
 * an absolute path inside the user's workspace.
 *
 * @param {...any} segments
 * @example
 * ```ts
 * resolveFromWorkspace('packages', 'cli', 'README.md');
 * // => /full/path/to/workspace/packages/cli/README.md
 * ```
 */
export function resolveFromWorkspace(...segments: string[]): string {
	return resolve(process.cwd(), ...segments);
}

/**
 * Convert an absolute path into a workspace-relative path when possible.
 *
 * - If `targetPath` is inside the current workspace, returns a path
 *   relative to `process.cwd()` (or `.` when it's the workspace root).
 * - Otherwise returns the original absolute `targetPath` unchanged.
 *
 * This is handy for creating portable metadata (for example in generated
 * IR or manifests) that avoids machine-specific absolute paths.
 *
 * @param targetPath - Absolute path to convert
 * @return Workspace-relative path or original absolute path
 */
export function toWorkspaceRelative(targetPath: string): string {
	const workspaceRoot = process.cwd();
	const relativePath = relative(workspaceRoot, targetPath);

	if (relativePath.startsWith('..')) {
		return targetPath;
	}

	return relativePath || '.';
}
