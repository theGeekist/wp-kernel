import type { ChildProcess } from 'node:child_process';

/**
 * @category Test Support
 */
export interface Disposable {
	dispose: () => Promise<void> | void;
}

/**
 * @category Test Support
 */
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

/**
 * @category Test Support
 */
export interface WorkspaceRunOptions {
	cwd?: string;
	env?: NodeJS.ProcessEnv;
	timeoutMs?: number;
	stdin?: string;
}

/**
 * @category Test Support
 */
export interface WorkspaceTools {
	readonly node: string;
	readonly pnpm: string;
}

/**
 * @category Test Support
 */
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

/**
 * @category Test Support
 */
export interface CliCommandOptions {
	cwd?: string;
	env?: NodeJS.ProcessEnv;
	timeoutMs?: number;
	stdin?: string;
}

/**
 * @category Test Support
 */
export interface CliCommand {
	command: string;
	args?: string[];
}

/**
 * @category Test Support
 */
export interface CliRunner {
	run: (
		command: CliCommand,
		options?: CliCommandOptions
	) => Promise<CliTranscript>;
}

/**
 * @category Test Support
 */
export interface RegistryPublishSummary {
	readonly name: string;
	readonly version: string;
	readonly tarballPath: string;
	readonly integrity: string;
	readonly shasum: string;
}

/**
 * @category Test Support
 */
export interface EphemeralRegistry extends Disposable {
	readonly url: string;
	readonly packages: RegistryPublishSummary[];
	readonly startedAt: string;
	readonly npmrc: string;
	writeNpmRc: (targetDir: string) => Promise<void>;
}

/**
 * @category Test Support
 */
export interface FileHashEntry {
	hash: string;
	size: number;
	mode: number;
}

/**
 * @category Test Support
 */
export interface FileManifest {
	generatedAt: string;
	files: Record<string, FileHashEntry>;
}

/**
 * @category Test Support
 */
export interface FileManifestDiff {
	added: string[];
	removed: string[];
	changed: string[];
}

/**
 * @category Test Support
 */
export interface BundleInspectionRequest {
	readonly buildDir: string;
	readonly externals?: string[];
}

/**
 * @category Test Support
 */
export interface BundleEntrySummary {
	file: string;
	size: number;
	hasSourceMap: boolean;
	sourceMapPath?: string;
	externalViolations: string[];
	sourcemapViolations: string[];
}

/**
 * @category Test Support
 */
export interface BundleInspectionResult {
	entries: BundleEntrySummary[];
	externalsChecked: string[];
	generatedAt: string;
}

/**
 * @category Test Support
 */
export interface GoldenSnapshot {
	manifest: FileManifest;
	bundle?: BundleInspectionResult;
	transcripts?: CliTranscript[];
	metadata?: Record<string, unknown>;
	version: number;
}

/**
 * @category Test Support
 */
export interface GoldenDiffSummary {
	added: string[];
	removed: string[];
	changed: string[];
	metadataChanges?: Record<string, { previous: unknown; next: unknown }>;
}

/**
 * @category Test Support
 */
export type CapabilityDescriptor =
	| string
	| {
			capability: string;
			appliesTo?: 'resource' | 'object';
			binding?: string;
	  };

/**
 * @category Test Support
 */
export interface CapabilityMap {
	resources?: Record<string, CapabilityDescriptor[] | undefined>;
	objects?: Record<string, CapabilityDescriptor[] | undefined>;
}

/**
 * @category Test Support
 */
export interface WPKernelConfigFabricatorOptions {
	namespace?: string;
	storage?: 'transient' | 'wp-post' | 'wp-option' | 'wp-taxonomy';
	includeSSRBlock?: boolean;
	includeJsBlock?: boolean;
	includeRemoteRoutes?: boolean;
	includeCapabilities?: boolean;
}

/**
 * @category Test Support
 */
export interface WPKernelConfigFabrication {
	config: unknown;
	capabilities: CapabilityMap;
	blocks: {
		ssr?: boolean;
		js?: boolean;
	};
}

/**
 * @category Test Support
 */
export interface SpawnedProcessHandles {
	process: ChildProcess;
	output: Promise<CliTranscript>;
}
