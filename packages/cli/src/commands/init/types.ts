import type { Reporter } from '@wpkernel/core/reporter';
import type { FileManifest, Workspace } from '../../workspace';
import type { DependencyResolution } from './dependency-versions';
import type {
	installComposerDependencies,
	installNodeDependencies,
} from './installers';
import type { ScaffoldFileDescriptor, ScaffoldStatus } from './utils';

export interface InitWorkflowEnv {
	readonly WPK_PREFER_REGISTRY_VERSIONS?: string;
	readonly REGISTRY_URL?: string;
	readonly WPK_INIT_INSTALL_NODE_MAX_MS?: string;
	readonly WPK_INIT_INSTALL_COMPOSER_MAX_MS?: string;
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
	readonly installDependencies?: boolean;
	readonly installers?: Partial<InitWorkflowInstallers>;
}

export type ScaffoldSummary = { path: string; status: ScaffoldStatus };

export interface InitWorkflowResult {
	readonly manifest: FileManifest;
	readonly summaryText: string;
	readonly summaries: ScaffoldSummary[];
	readonly dependencySource: string;
	readonly namespace: string;
	readonly templateName: string;
	readonly installations?: InstallationMeasurements;
}

export interface PluginDetectionResult {
	readonly detected: boolean;
	readonly reasons: readonly string[];
	readonly skipTargets: readonly string[];
}

export interface StageMeasurement {
	readonly durationMs: number;
	readonly budgetMs: number;
}

export interface InstallationMeasurements {
	readonly npm?: StageMeasurement;
	readonly composer?: StageMeasurement;
}

export interface InitWorkflowInstallers {
	readonly installNodeDependencies: typeof installNodeDependencies;
	readonly installComposerDependencies: typeof installComposerDependencies;
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
	installations?: InstallationMeasurements;
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
	installations?: InstallationMeasurements;
}

export type InitPipelineRunOptions = Omit<
	InitWorkflowOptions,
	'installers' | 'installDependencies'
> & {
	readonly installDependencies: boolean;
	readonly installers: InitWorkflowInstallers;
};

export interface InitPipelineContext {
	readonly workspace: Workspace;
	readonly reporter: Reporter;
	readonly options: InitPipelineRunOptions;
}
