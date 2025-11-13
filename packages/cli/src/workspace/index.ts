/**
 * Builds a workspace instance for interacting with the file system.
 *
 * This function provides an abstraction over file system operations within a defined
 * workspace root, offering methods for reading, writing, and managing files.
 *
 * @category Workspace
 * @param    root - The absolute path to the workspace root directory.
 * @returns A `Workspace` instance.
 */
export { buildWorkspace } from './filesystem';
export {
	ensureCleanDirectory,
	promptConfirm,
	toWorkspaceRelative,
	readWorkspaceGitStatus,
} from './utilities';
export type {
	EnsureCleanDirectoryOptions,
	ConfirmPromptOptions,
	WorkspaceGitStatus,
	WorkspaceGitStatusEntry,
} from './utilities';
export type {
	Workspace,
	FileManifest,
	MergeOptions,
	MergeMarkers,
	WriteOptions,
	WriteJsonOptions,
	RemoveOptions,
} from './types';
