export interface FileManifest {
	readonly writes: readonly string[];
	readonly deletes: readonly string[];
}

export interface WorkspaceGitHandle {
	isRepo: () => Promise<boolean>;
	add: (paths: string | readonly string[]) => Promise<void>;
	commit: (message: string) => Promise<void>;
	currentBranch: () => Promise<string>;
}

export interface WriteOptions {
	readonly mode?: number;
	readonly ensureDir?: boolean;
}

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

export interface Workspace {
	readonly root: string;
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
	exists: (target: string) => Promise<boolean>;
	rm: (target: string, options?: RemoveOptions) => Promise<void>;
	glob: (pattern: string | readonly string[]) => Promise<string[]>;
	threeWayMerge: (
		file: string,
		base: string,
		current: string,
		incoming: string,
		options?: MergeOptions
	) => Promise<'clean' | 'conflict'>;
	readonly git?: WorkspaceGitHandle;
	begin: (label?: string) => void;
	commit: (label?: string) => Promise<FileManifest>;
	rollback: (label?: string) => Promise<FileManifest>;
	dryRun: <T>(
		fn: () => Promise<T>
	) => Promise<{ result: T; manifest: FileManifest }>;
	tmpDir: (prefix?: string) => Promise<string>;
	resolve: (...parts: string[]) => string;
}
