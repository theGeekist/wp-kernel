import path from 'node:path';
import { promises as fs } from 'node:fs';
import type { IsolatedWorkspace } from '../integration/types.js';
import { createIsolatedWorkspace } from '../integration/workspace.js';

export type WithWorkspaceCallback<TResult> = (
	workspace: IsolatedWorkspace
) => Promise<TResult> | TResult;

export interface WithIsolatedWorkspaceOptions {
	prefix?: string;
	env?: NodeJS.ProcessEnv;
	timezone?: string;
	locale?: string;
}

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
