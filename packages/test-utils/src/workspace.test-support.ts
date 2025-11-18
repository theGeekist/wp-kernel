import path from 'node:path';
import type {
	WorkspaceFileManifestLike,
	WorkspaceLike,
	WorkspaceMergeOptionsLike,
	WorkspaceRemoveOptionsLike,
	WorkspaceWriteJsonOptionsLike,
	WorkspaceWriteOptionsLike,
} from './types.js';

export type { WorkspaceOptions } from './integration/index.js';
export { withWorkspace, createWorkspaceRunner } from './integration/index.js';

export type WorkspaceMockOptions<
	TWorkspace extends WorkspaceLike = WorkspaceLike,
> = Partial<Omit<TWorkspace, 'root'>> & { readonly root?: string };

function makeEmptyManifest(): WorkspaceFileManifestLike {
	return { writes: [], deletes: [] };
}

async function defaultWrite(
	_file: string,
	_data: Buffer | string,
	_options?: WorkspaceWriteOptionsLike
): Promise<void> {
	// Intentionally no-op.
}

async function defaultWriteJson<T>(
	_file: string,
	_value: T,
	_options?: WorkspaceWriteJsonOptionsLike
): Promise<void> {
	// Intentionally no-op.
}

async function defaultRm(
	_target: string,
	_options?: WorkspaceRemoveOptionsLike
): Promise<void> {
	// Intentionally no-op.
}

async function defaultThreeWayMerge(
	_file: string,
	_base: string,
	_current: string,
	_incoming: string,
	_options?: WorkspaceMergeOptionsLike
): Promise<'clean' | 'conflict'> {
	return 'clean';
}

async function defaultDryRun<T>(
	callback: () => Promise<T>
): Promise<{ result: T; manifest: WorkspaceFileManifestLike }> {
	return {
		result: await callback(),
		manifest: makeEmptyManifest(),
	};
}

/* eslint-disable complexity */
export function makeWorkspaceMock<
	TWorkspace extends WorkspaceLike = WorkspaceLike,
>(overrides: WorkspaceMockOptions<TWorkspace> = {}): TWorkspace {
	const manifestFactory = () => makeEmptyManifest();
	const defaultRoot = path.join(process.cwd(), 'next-workspace');
	const {
		root = defaultRoot,
		cwd = () => root,
		read = async () => null,
		readText = async () => null,
		write = defaultWrite,
		writeJson = defaultWriteJson,
		exists = async () => false,
		rm = defaultRm,
		glob = async () => [],
		threeWayMerge = defaultThreeWayMerge,
		begin = () => undefined,
		commit = async () => manifestFactory(),
		rollback = async () => manifestFactory(),
		dryRun = defaultDryRun,
		tmpDir,
		resolve,
	} = overrides as WorkspaceMockOptions<WorkspaceLike>;

	const defaultTmpDir = async (prefix = 'workspace-') =>
		path.join(
			root,
			'.tmp',
			`${prefix}${Math.random().toString(16).slice(2)}`
		);
	const defaultResolve = (...parts: string[]) => path.join(root, ...parts);

	const workspace: WorkspaceLike = {
		root,
		cwd,
		read,
		readText,
		write,
		writeJson,
		exists,
		rm,
		glob,
		threeWayMerge,
		begin,
		commit,
		rollback,
		dryRun,
		tmpDir: tmpDir ?? defaultTmpDir,
		resolve: resolve ?? defaultResolve,
	} satisfies WorkspaceLike;

	return workspace as TWorkspace;
}
/* eslint-enable complexity */
