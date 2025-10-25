import path from 'node:path';
import type {
	Workspace,
	FileManifest,
	MergeOptions,
	RemoveOptions,
	WriteJsonOptions,
	WriteOptions,
} from '../src/next/workspace';

export type { WorkspaceOptions } from '@wpkernel/test-utils/integration';
export {
	withWorkspace,
	createWorkspaceRunner,
} from '@wpkernel/test-utils/integration';

export interface WorkspaceMockOptions extends Partial<Workspace> {
	readonly root?: string;
}

function createEmptyManifest(): FileManifest {
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
		manifest: createEmptyManifest(),
	};
}

export function createWorkspaceMock(
	overrides: WorkspaceMockOptions = {}
): Workspace {
	const root = overrides.root ?? path.join(process.cwd(), 'next-workspace');
	const manifestFactory = () => createEmptyManifest();

	return {
		root,
		cwd: overrides.cwd ?? (() => root),
		read: overrides.read ?? (async () => null),
		readText: overrides.readText ?? (async () => null),
		write: overrides.write ?? defaultWrite,
		writeJson: overrides.writeJson ?? defaultWriteJson,
		exists: overrides.exists ?? (async () => false),
		rm: overrides.rm ?? defaultRm,
		glob: overrides.glob ?? (async () => []),
		threeWayMerge: overrides.threeWayMerge ?? defaultThreeWayMerge,
		begin: overrides.begin ?? (() => undefined),
		commit: overrides.commit ?? (async () => manifestFactory()),
		rollback: overrides.rollback ?? (async () => manifestFactory()),
		dryRun: overrides.dryRun ?? defaultDryRun,
		tmpDir:
			overrides.tmpDir ??
			(async (prefix = 'workspace-') =>
				path.join(
					root,
					'.tmp',
					`${prefix}${Math.random().toString(16).slice(2)}`
				)),
		resolve:
			overrides.resolve ??
			((...parts: string[]) => path.join(root, ...parts)),
	} satisfies Workspace;
}
