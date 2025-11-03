import type { Command } from 'clipanion';
import type { createReporter } from '@wpkernel/core/reporter';
import type { SerializedError, WPKExitCode } from '@wpkernel/core/contracts';
import type { BuilderOutput } from '../../runtime/types';
import type { LoadedWPKernelConfig } from '../../config/types';
import type { FileManifest, Workspace } from '../../workspace';
import type { createPatcher } from '../../builders';

export interface PatchManifestSummary {
	readonly applied: number;
	readonly conflicts: number;
	readonly skipped: number;
}

export type PatchStatus = 'applied' | 'conflict' | 'skipped';

export interface PatchRecord {
	readonly file: string;
	readonly status: PatchStatus;
	readonly description?: string;
	readonly details?: Record<string, unknown>;
}

export interface PatchManifest {
	readonly summary: PatchManifestSummary;
	readonly records: PatchRecord[];
	readonly actions: readonly string[];
}

export type ApplyLogStatus =
	| 'success'
	| 'conflict'
	| 'skipped'
	| 'cancelled'
	| 'failed';

export type ReporterFactory = typeof createReporter;
export type ReporterInstance = ReturnType<ReporterFactory>;

export interface ApplyLogEntry {
	readonly version: 1;
	readonly timestamp: string;
	readonly status: ApplyLogStatus;
	readonly exitCode: WPKExitCode;
	readonly flags: ApplyFlags;
	readonly summary: PatchManifestSummary | null;
	readonly records: readonly PatchRecord[];
	readonly actions: readonly string[];
	readonly error?: SerializedError;
}

export interface ApplyFlags {
	readonly yes: boolean;
	readonly backup: boolean;
	readonly force: boolean;
	readonly cleanup: readonly string[];
}

export type ApplyCommandInstance = Command & {
	yes: boolean;
	backup: boolean;
	force: boolean;
	cleanup?: string[];
	summary: PatchManifestSummary | null;
	records: PatchRecord[];
	manifest: PatchManifest | null;
};

export interface PreviewResult {
	readonly manifest: PatchManifest | null;
	readonly workspaceManifest: FileManifest;
}

export interface PreviewOptions {
	readonly dependencies: ApplyCommandDependencies;
	readonly workspace: Workspace;
	readonly loaded: LoadedWPKernelConfig;
}

export interface ApplyExecutionOptions {
	readonly dependencies: ApplyCommandDependencies;
	readonly workspace: Workspace;
	readonly loaded: LoadedWPKernelConfig;
	readonly reporter: ReporterInstance;
}

export interface NoManifestOptions {
	readonly command: ApplyCommandInstance;
	readonly workspace: Workspace;
	readonly dependencies: ApplyCommandDependencies;
	readonly reporter: ReporterInstance;
	readonly flags: ApplyFlags;
}

export interface CancellationOptions {
	readonly command: ApplyCommandInstance;
	readonly workspace: Workspace;
	readonly dependencies: ApplyCommandDependencies;
	readonly reporter: ReporterInstance;
	readonly flags: ApplyFlags;
}

export interface CompletionOptions {
	readonly workspace: Workspace;
	readonly dependencies: ApplyCommandDependencies;
	readonly reporter: ReporterInstance;
	readonly manifest: PatchManifest;
	readonly flags: ApplyFlags;
}

export interface FailureLogOptions {
	readonly workspace: Workspace;
	readonly dependencies: ApplyCommandDependencies;
	readonly flags: ApplyFlags;
	readonly exitCode: WPKExitCode;
	readonly error: unknown;
}

export interface WorkspaceSetupOptions {
	readonly dependencies: ApplyCommandDependencies;
}

export interface WorkspaceSetupResult {
	readonly workspace: Workspace;
	readonly loaded: LoadedWPKernelConfig;
}

export interface PreviewStageOptions {
	readonly command: ApplyCommandInstance;
	readonly workspace: Workspace;
	readonly dependencies: ApplyCommandDependencies;
	readonly reporter: ReporterInstance;
	readonly flags: ApplyFlags;
	readonly preview: PreviewResult;
}

export interface ConfirmApplyOptions {
	readonly command: ApplyCommandInstance;
	readonly dependencies: ApplyCommandDependencies;
	readonly manifest: PatchManifest;
}

export interface CreateBackupsOptions {
	readonly workspace: Workspace;
	readonly manifest: FileManifest;
	readonly reporter: ReporterInstance;
}

export interface BuildApplyCommandOptions {
	readonly loadWPKernelConfig?: () => Promise<LoadedWPKernelConfig>;
	readonly buildWorkspace?: (root: string) => Workspace;
	readonly createPatcher?: typeof createPatcher;
	readonly buildReporter?: ReporterFactory;
	readonly buildBuilderOutput?: () => BuilderOutput;
	readonly readManifest?: (
		workspace: Workspace
	) => Promise<PatchManifest | null>;
	readonly resolveWorkspaceRoot?: (loaded: LoadedWPKernelConfig) => string;
	readonly promptConfirm?: (options: {
		readonly message: string;
		readonly defaultValue: boolean;
		readonly input: NodeJS.ReadableStream;
		readonly output: NodeJS.WritableStream;
	}) => Promise<boolean>;
	readonly ensureGitRepository?: (workspace: Workspace) => Promise<void>;
	readonly createBackups?: (options: CreateBackupsOptions) => Promise<void>;
	readonly appendApplyLog?: (
		workspace: Workspace,
		entry: ApplyLogEntry
	) => Promise<void>;
}

export type ApplyCommandDependencies = Required<BuildApplyCommandOptions>;

export type ApplyCommandConstructor = new () => ApplyCommandInstance;
