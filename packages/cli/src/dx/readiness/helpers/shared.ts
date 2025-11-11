import type { DxContext } from '../../context';

type ResolvePathSource = 'workspace' | 'environmentWorkspace' | 'project';

const DEFAULT_RESOLVE_PATH_ORDER: readonly ResolvePathSource[] = [
	'environmentWorkspace',
	'workspace',
	'project',
];

const SOURCE_RESOLVERS: Record<
	ResolvePathSource,
	(context: DxContext) => string | null
> = {
	workspace: (context) => context.workspace?.root ?? null,
	environmentWorkspace: (context) => context.environment.workspaceRoot,
	project: (context) => context.environment.projectRoot,
};

export function resolveWorkspaceRoot(context: DxContext): string {
	return (
		context.environment.workspaceRoot ??
		context.workspace?.root ??
		context.environment.cwd
	);
}

export function buildResolvePaths(
	context: DxContext,
	order: readonly ResolvePathSource[] = DEFAULT_RESOLVE_PATH_ORDER
): string[] {
	const paths = new Set<string>();

	for (const key of order) {
		const value = SOURCE_RESOLVERS[key](context);
		if (value) {
			paths.add(value);
		}
	}

	return Array.from(paths);
}
