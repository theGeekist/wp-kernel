import type { Workspace } from '../../workspace';

export type WorkspaceLanguage = 'typescript' | 'javascript';

export async function detectWorkspaceLanguage(
	workspace: Workspace
): Promise<WorkspaceLanguage> {
	if (await fileExists(workspace, 'tsconfig.json')) {
		return 'typescript';
	}

	const packageJson = await workspace.readText('package.json');
	if (packageJson) {
		try {
			const pkg = JSON.parse(packageJson) as {
				dependencies?: Record<string, string>;
				devDependencies?: Record<string, string>;
				peerDependencies?: Record<string, string>;
			};

			if (hasTypeScriptDependency(pkg)) {
				return 'typescript';
			}
		} catch {
			// ignore malformed package.json
		}
	}

	return 'javascript';
}

async function fileExists(workspace: Workspace, relativePath: string) {
	try {
		const contents = await workspace.read(relativePath);
		return contents !== null;
	} catch {
		return false;
	}
}

function hasTypeScriptDependency(pkg: {
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
}): boolean {
	return ['dependencies', 'devDependencies', 'peerDependencies'].some(
		(section) =>
			Object.keys(pkg[section as keyof typeof pkg] ?? {}).some((name) =>
				TS_DEPENDENCIES.has(name)
			)
	);
}

const TS_DEPENDENCIES = new Set([
	'typescript',
	'ts-node',
	'tsx',
	'@tsconfig/node16',
	'@tsconfig/node18',
]);
