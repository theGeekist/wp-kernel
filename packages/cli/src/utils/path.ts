import { relative, resolve } from 'node:path';

export function resolveFromWorkspace(...segments: string[]): string {
	return resolve(process.cwd(), ...segments);
}

export function toWorkspaceRelative(targetPath: string): string {
	const workspaceRoot = process.cwd();
	const relativePath = relative(workspaceRoot, targetPath);

	if (relativePath.startsWith('..')) {
		return targetPath;
	}

	return relativePath || '.';
}
