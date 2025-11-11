import { createReporter } from '@wpkernel/core/reporter';
import { WPK_SUBSYSTEM_NAMESPACES } from '@wpkernel/core/namespace';
import type { DxContext } from '../../context';
import type { Workspace } from '../../../workspace';

export interface CreateReadinessTestContextOptions {
	readonly namespace?: string;
	readonly workspace?: Workspace | null;
	readonly workspaceRoot?: string | null;
	readonly cwd?: string;
	readonly projectRoot?: string;
}

export interface WorkspaceDoubleOverrides extends Partial<Workspace> {
	readonly root?: string;
}

export function createReadinessTestContext({
	namespace = WPK_SUBSYSTEM_NAMESPACES.REPORTER,
	workspace = null,
	workspaceRoot = workspace ? workspace.root : null,
	cwd = workspaceRoot ?? '/tmp/project',
	projectRoot = '/repo/packages/cli',
}: CreateReadinessTestContextOptions = {}): DxContext {
	return {
		reporter: createReporter({
			namespace,
			level: 'debug',
			enabled: false,
		}),
		workspace,
		environment: {
			cwd,
			projectRoot,
			workspaceRoot,
			flags: { forceSource: false },
		},
	} satisfies DxContext;
}

export function createWorkspaceDouble({
	root = '/tmp/project',
	resolve = (...parts: string[]) => [root, ...parts].join('/'),
	...overrides
}: WorkspaceDoubleOverrides = {}): Workspace {
	const workspace = {
		root,
		resolve,
		exists: async () => false,
		rm: async () => undefined,
		read: async () => Buffer.alloc(0),
		readText: async () => '',
		write: async () => undefined,
		writeJson: async () => undefined,
		glob: async () => [],
		threeWayMerge: async () => 'clean' as const,
		begin: () => undefined,
		commit: async () => ({ writes: [], deletes: [] }),
		rollback: async () => ({ writes: [], deletes: [] }),
		dryRun: async <T>(fn: () => Promise<T>) => ({
			result: await fn(),
			manifest: { writes: [], deletes: [] },
		}),
		tmpDir: async () => root,
		cwd: () => root,
		...overrides,
	} as unknown as Workspace;

	return workspace;
}
