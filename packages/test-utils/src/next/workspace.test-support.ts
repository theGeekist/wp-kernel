import path from 'node:path';
import type {
	Workspace,
	FileManifest,
	MergeOptions,
	RemoveOptions,
	WriteJsonOptions,
	WriteOptions,
} from '@wpkernel/cli/next/workspace';

export type { WorkspaceOptions } from '@wpkernel/test-utils/integration';
export {
	withWorkspace,
	createWorkspaceRunner,
} from '@wpkernel/test-utils/integration';

export interface WorkspaceMockOptions extends Partial<Workspace> {
	readonly root?: string;
}

function makeEmptyManifest(): FileManifest {
	return { writes: [], deletes: [] };
}

async function defaultWrite(
	_file: string,
	_data: Buffer | string,
	_options?: WriteOptions
): Promise<void> {
	// Intentionally no-op.
}

async function defaultWriteJson<T>(
	_file: string,
	_value: T,
	_options?: WriteJsonOptions
): Promise<void> {
	// Intentionally no-op.
}

async function defaultRm(
	_target: string,
	_options?: RemoveOptions
): Promise<void> {
	// Intentionally no-op.
}

async function defaultThreeWayMerge(
	_file: string,
	_base: string,
	_current: string,
	_incoming: string,
	_options?: MergeOptions
): Promise<'clean' | 'conflict'> {
	return 'clean';
}

async function defaultDryRun<T>(
	callback: () => Promise<T>
): Promise<{ result: T; manifest: FileManifest }> {
	return {
		result: await callback(),
		manifest: makeEmptyManifest(),
	};
}

/* eslint-disable complexity */
export function makeWorkspaceMock(
	overrides: WorkspaceMockOptions = {}
): Workspace {
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
	} = overrides;

	const defaultTmpDir = async (prefix = 'workspace-') =>
		path.join(
			root,
			'.tmp',
			`${prefix}${Math.random().toString(16).slice(2)}`
		);
	const defaultResolve = (...parts: string[]) => path.join(root, ...parts);

	return {
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
	} satisfies Workspace;
}
/* eslint-enable complexity */
