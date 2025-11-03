import type { ChildProcess } from 'node:child_process';

export interface Disposable {
	dispose: () => Promise<void> | void;
}

export interface IsolatedWorkspace extends Disposable {
	/** Absolute path to the workspace root */
	readonly root: string;
	/** Normalised environment variables applied to spawned processes */
	readonly env: NodeJS.ProcessEnv;
	/** Convenience accessor for pinned tooling */
	readonly tools: WorkspaceTools;
	/**
	 * Run a command within the workspace root.
	 *
	 * @param command - binary to execute
	 * @param args    - optional command arguments
	 * @param options - spawn overrides
	 */
	run: (
		command: string,
		args?: string[],
		options?: WorkspaceRunOptions
	) => Promise<CliTranscript>;
}

export interface WorkspaceRunOptions {
	cwd?: string;
	env?: NodeJS.ProcessEnv;
	timeoutMs?: number;
	stdin?: string;
}

export interface WorkspaceTools {
	readonly node: string;
	readonly pnpm: string;
}

export interface CliTranscript {
	command: string;
	args: string[];
	cwd: string;
	startedAt: string;
	completedAt: string;
	durationMs: number;
	exitCode: number;
	stdout: string;
	stderr: string;
	env: Record<string, string | undefined>;
}

export interface CliCommandOptions {
	cwd?: string;
	env?: NodeJS.ProcessEnv;
	timeoutMs?: number;
	stdin?: string;
}

export interface CliCommand {
	command: string;
	args?: string[];
}

export interface CliRunner {
	run: (
		command: CliCommand,
		options?: CliCommandOptions
	) => Promise<CliTranscript>;
}

export interface RegistryPublishSummary {
	readonly name: string;
	readonly version: string;
	readonly tarballPath: string;
	readonly integrity: string;
	readonly shasum: string;
}

export interface EphemeralRegistry extends Disposable {
	readonly url: string;
	readonly packages: RegistryPublishSummary[];
	readonly startedAt: string;
	readonly npmrc: string;
	writeNpmRc: (targetDir: string) => Promise<void>;
}

export interface FileHashEntry {
	hash: string;
	size: number;
	mode: number;
}

export interface FileManifest {
	generatedAt: string;
	files: Record<string, FileHashEntry>;
}

export interface FileManifestDiff {
	added: string[];
	removed: string[];
	changed: string[];
}

export interface BundleInspectionRequest {
	readonly buildDir: string;
	readonly externals?: string[];
}

export interface BundleEntrySummary {
	file: string;
	size: number;
	hasSourceMap: boolean;
	sourceMapPath?: string;
	externalViolations: string[];
	sourcemapViolations: string[];
}

export interface BundleInspectionResult {
	entries: BundleEntrySummary[];
	externalsChecked: string[];
	generatedAt: string;
}

export interface GoldenSnapshot {
	manifest: FileManifest;
	bundle?: BundleInspectionResult;
	transcripts?: CliTranscript[];
	metadata?: Record<string, unknown>;
	version: number;
}

export interface GoldenDiffSummary {
	added: string[];
	removed: string[];
	changed: string[];
	metadataChanges?: Record<string, { previous: unknown; next: unknown }>;
}

export type CapabilityDescriptor =
	| string
	| {
			capability: string;
			appliesTo?: 'resource' | 'object';
			binding?: string;
	  };

export interface CapabilityMap {
	resources?: Record<string, CapabilityDescriptor[] | undefined>;
	objects?: Record<string, CapabilityDescriptor[] | undefined>;
}

export interface WPKernelConfigFabricatorOptions {
	namespace?: string;
	storage?: 'transient' | 'wp-post' | 'wp-option' | 'wp-taxonomy';
	includeSSRBlock?: boolean;
	includeJsBlock?: boolean;
	includeRemoteRoutes?: boolean;
	includeCapabilities?: boolean;
}

export interface WPKernelConfigFabrication {
	config: unknown;
	capabilities: CapabilityMap;
	blocks: {
		ssr?: boolean;
		js?: boolean;
	};
}

export interface SpawnedProcessHandles {
	process: ChildProcess;
	output: Promise<CliTranscript>;
}
