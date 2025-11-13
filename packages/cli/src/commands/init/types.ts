import type { Reporter } from '@wpkernel/core/reporter';
import type { FileManifest, Workspace } from '../../workspace';
import type { DependencyResolution } from './dependency-versions';
import type { ScaffoldFileDescriptor, ScaffoldStatus } from './utils';

export interface InitWorkflowEnv {
	readonly WPK_PREFER_REGISTRY_VERSIONS?: string;
	readonly REGISTRY_URL?: string;
}

export interface InitWorkflowOptions {
	readonly workspace: Workspace;
	readonly reporter: Reporter;
	readonly projectName?: string;
	readonly template?: string;
	readonly force?: boolean;
	readonly verbose?: boolean;
	readonly preferRegistryVersionsFlag?: boolean;
	readonly env?: InitWorkflowEnv;
}

export type ScaffoldSummary = { path: string; status: ScaffoldStatus };

export interface InitWorkflowResult {
	readonly manifest: FileManifest;
	readonly summaryText: string;
	readonly summaries: ScaffoldSummary[];
	readonly dependencySource: string;
	readonly namespace: string;
	readonly templateName: string;
}

export interface PluginDetectionResult {
	readonly detected: boolean;
	readonly reasons: readonly string[];
	readonly skipTargets: readonly string[];
}

export interface InitPipelineDraft {
	namespace?: string;
	templateName?: string;
	scaffoldFiles?: readonly ScaffoldFileDescriptor[];
	pluginDetection?: PluginDetectionResult;
	skipSet?: ReadonlySet<string>;
	dependencyResolution?: DependencyResolution;
	replacements?: Map<string, Record<string, string>>;
	summaries: ScaffoldSummary[];
	manifest?: FileManifest;
	result?: InitWorkflowResult;
}

export interface InitPipelineArtifact {
	readonly namespace: string;
	readonly templateName: string;
	readonly scaffoldFiles: readonly ScaffoldFileDescriptor[];
	readonly pluginDetection: PluginDetectionResult;
	readonly skipSet: ReadonlySet<string> | undefined;
	readonly dependencyResolution: DependencyResolution;
	readonly replacements: Map<string, Record<string, string>>;
	summaries: ScaffoldSummary[];
	manifest?: FileManifest;
	result?: InitWorkflowResult;
}

export type InitPipelineRunOptions = InitWorkflowOptions;

export interface InitPipelineContext {
	readonly workspace: Workspace;
	readonly reporter: Reporter;
	readonly options: InitPipelineRunOptions;
}
