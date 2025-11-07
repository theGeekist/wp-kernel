import path from 'node:path';
import { promises as fs } from 'node:fs';
import type { IsolatedWorkspace } from '../integration/types.js';
import { createIsolatedWorkspace } from '../integration/workspace.js';

/**
 * Callback executed with an isolated workspace instance.
 *
 * @category Test Support
 */
export type WithWorkspaceCallback<TResult> = (
	workspace: IsolatedWorkspace
) => Promise<TResult> | TResult;

/**
 * Options for creating an isolated on-disk workspace.
 *
 * @category Test Support
 */
export interface WithIsolatedWorkspaceOptions {
	prefix?: string;
	env?: NodeJS.ProcessEnv;
	timezone?: string;
	locale?: string;
}

/**
 * Run a callback against a disposable workspace rooted on disk.
 *
 * @param    options
 * @param    callback
 * @category Test Support
 */
export async function withIsolatedWorkspace<TResult>(
	options: WithIsolatedWorkspaceOptions,
	callback: WithWorkspaceCallback<TResult>
): Promise<TResult>;
export async function withIsolatedWorkspace<TResult>(
	callback: WithWorkspaceCallback<TResult>
): Promise<TResult>;
export async function withIsolatedWorkspace<TResult>(
	optionsOrCallback:
		| WithIsolatedWorkspaceOptions
		| WithWorkspaceCallback<TResult>,
	maybeCallback?: WithWorkspaceCallback<TResult>
): Promise<TResult> {
	const options =
		typeof optionsOrCallback === 'function' ? {} : optionsOrCallback;
	const callback =
		typeof optionsOrCallback === 'function'
			? optionsOrCallback
			: maybeCallback;

	if (!callback) {
		throw new Error('withIsolatedWorkspace requires a callback');
	}

	const workspace = await createIsolatedWorkspace(options);
	try {
		return await callback(workspace);
	} finally {
		await workspace.dispose();
	}
}

export type WorkspaceFileTree = Record<string, string>;

/**
 * Write a set of files into an isolated workspace tree.
 *
 * @category Test Support
 * @param    workspace - Workspace descriptor returned by {@link withIsolatedWorkspace}.
 * @param    files     - Mapping of relative paths to file contents.
 */
export async function writeWorkspaceFiles(
	workspace: IsolatedWorkspace,
	files: WorkspaceFileTree
): Promise<void> {
	for (const [relativePath, contents] of Object.entries(files)) {
		const absolutePath = path.join(workspace.root, relativePath);
		await fs.mkdir(path.dirname(absolutePath), { recursive: true });
		await fs.writeFile(absolutePath, contents, 'utf8');
	}
}
