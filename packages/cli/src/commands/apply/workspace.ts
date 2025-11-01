import fs from 'node:fs/promises';
import path from 'node:path';
import { WPKernelError } from '@wpkernel/core/contracts';
import { serialiseError } from './errors';
import type { LoadedWPKernelConfig } from '../../config/types';
import type { Workspace } from '../../next/workspace';
import type { WorkspaceSetupOptions, WorkspaceSetupResult } from './types';

export async function ensureGitRepository(workspace: Workspace): Promise<void> {
	const workspaceRoot = workspace.cwd();
	let current = workspaceRoot;

	while (true) {
		const gitPath = path.join(current, '.git');

		try {
			const stats = await fs.lstat(gitPath);
			if (
				stats.isDirectory() ||
				stats.isFile() ||
				stats.isSymbolicLink()
			) {
				return;
			}
		} catch (error) {
			const errorCode = (error as NodeJS.ErrnoException).code;
			if (errorCode && errorCode !== 'ENOENT') {
				throw new WPKernelError('DeveloperError', {
					message: 'Unable to inspect git repository state.',
					context: {
						path: path.relative(workspaceRoot, gitPath) || '.git',
						error: serialiseError(error),
					},
				});
			}
		}

		const parent = path.dirname(current);
		if (parent === current) {
			break;
		}

		current = parent;
	}

	throw new WPKernelError('ValidationError', {
		message: 'Apply requires a git repository.',
		context: { path: '.git' },
	});
}

export function resolveWorkspaceRoot(loaded: LoadedWPKernelConfig): string {
	return path.dirname(loaded.sourcePath);
}

export async function initialiseWorkspace({
	dependencies,
}: WorkspaceSetupOptions): Promise<WorkspaceSetupResult> {
	const loaded = await dependencies.loadWPKernelConfig();
	const workspaceRoot = dependencies.resolveWorkspaceRoot(loaded);
	const workspace = dependencies.buildWorkspace(workspaceRoot);

	await dependencies.ensureGitRepository(workspace);

	return { workspace, loaded } satisfies WorkspaceSetupResult;
}
