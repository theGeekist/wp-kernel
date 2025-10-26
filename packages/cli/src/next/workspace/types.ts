import type { WorkspaceWriteOptions } from '@wpkernel/php-json-ast';
import type { WorkspaceLike } from '@wpkernel/php-driver';

export interface FileManifest {
	readonly writes: readonly string[];
	readonly deletes: readonly string[];
}

export type WriteOptions = WorkspaceWriteOptions;

export interface WriteJsonOptions extends WriteOptions {
	readonly pretty?: boolean;
}

export interface RemoveOptions {
	readonly recursive?: boolean;
}

export interface MergeMarkers {
	readonly start: string;
	readonly mid: string;
	readonly end: string;
}

export interface MergeOptions {
	readonly markers?: MergeMarkers;
}

export interface Workspace extends WorkspaceLike {
	cwd: () => string;
	read: (file: string) => Promise<Buffer | null>;
	readText: (file: string) => Promise<string | null>;
	write: (
		file: string,
		data: Buffer | string,
		options?: WriteOptions
	) => Promise<void>;
	writeJson: <T>(
		file: string,
		value: T,
		options?: WriteJsonOptions
	) => Promise<void>;
	rm: (target: string, options?: RemoveOptions) => Promise<void>;
	glob: (pattern: string | readonly string[]) => Promise<string[]>;
	threeWayMerge: (
		file: string,
		base: string,
		current: string,
		incoming: string,
		options?: MergeOptions
	) => Promise<'clean' | 'conflict'>;
	begin: (label?: string) => void;
	commit: (label?: string) => Promise<FileManifest>;
	rollback: (label?: string) => Promise<FileManifest>;
	dryRun: <T>(
		fn: () => Promise<T>
	) => Promise<{ result: T; manifest: FileManifest }>;
	tmpDir: (prefix?: string) => Promise<string>;
}
