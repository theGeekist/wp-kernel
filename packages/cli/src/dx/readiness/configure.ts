import { createReadinessRegistry, type ReadinessRegistry } from './registry';
import type { ReadinessKey } from './types';
import {
	createComposerReadinessHelper,
	createGitReadinessHelper,
	createPhpDriverReadinessHelper,
	createPhpPrinterPathReadinessHelper,
	createPhpRuntimeReadinessHelper,
	createBootstrapperResolutionReadinessHelper,
	createReleasePackReadinessHelper,
	createTsxRuntimeReadinessHelper,
	createWorkspaceHygieneReadinessHelper,
	type ComposerHelperOverrides,
	type GitHelperDependencies,
	type PhpDriverDependencies,
	type PhpPrinterPathDependencies,
	type PhpRuntimeDependencies,
	type BootstrapperResolutionHelperOptions,
	type ReleasePackHelperOptions,
	type TsxRuntimeDependencies,
	type WorkspaceHygieneDependencies,
	createQuickstartReadinessHelper,
	type QuickstartHelperOptions,
} from './helpers';

export interface DefaultReadinessHelperOverrides {
	readonly git?: Partial<GitHelperDependencies>;
	readonly composer?: ComposerHelperOverrides;
	readonly phpRuntime?: Partial<PhpRuntimeDependencies>;
	readonly phpDriver?: Partial<PhpDriverDependencies>;
	readonly phpPrinterPath?: Partial<PhpPrinterPathDependencies>;
	readonly tsxRuntime?: Partial<TsxRuntimeDependencies>;
	readonly workspaceHygiene?: Partial<WorkspaceHygieneDependencies>;
	readonly releasePack?: ReleasePackHelperOptions;
	readonly bootstrapperResolution?: BootstrapperResolutionHelperOptions;
	readonly quickstart?: QuickstartHelperOptions;
}

export interface BuildDefaultReadinessRegistryOptions {
	readonly helperOverrides?: DefaultReadinessHelperOverrides;
}

export const DEFAULT_READINESS_ORDER: ReadonlyArray<ReadinessKey> = [
	'workspace-hygiene',
	'git',
	'composer',
	'php-runtime',
	'php-driver',
	'php-printer-path',
	'tsx-runtime',
	'release-pack',
	'bootstrapper-resolution',
	'quickstart',
];

export function registerDefaultReadinessHelpers(
	registry: ReadinessRegistry,
	overrides: DefaultReadinessHelperOverrides = {}
): void {
	registry.register(
		createWorkspaceHygieneReadinessHelper(overrides.workspaceHygiene)
	);
	registry.register(createGitReadinessHelper(overrides.git));
	registry.register(createComposerReadinessHelper(overrides.composer));
	registry.register(createPhpRuntimeReadinessHelper(overrides.phpRuntime));
	registry.register(createPhpDriverReadinessHelper(overrides.phpDriver));
	registry.register(
		createPhpPrinterPathReadinessHelper(overrides.phpPrinterPath)
	);
	registry.register(createTsxRuntimeReadinessHelper(overrides.tsxRuntime));
	registry.register(createReleasePackReadinessHelper(overrides.releasePack));
	registry.register(
		createBootstrapperResolutionReadinessHelper(
			overrides.bootstrapperResolution
		)
	);
	registry.register(createQuickstartReadinessHelper(overrides.quickstart));
}

export function buildDefaultReadinessRegistry(
	options: BuildDefaultReadinessRegistryOptions = {}
): ReadinessRegistry {
	const registry = createReadinessRegistry();
	registerDefaultReadinessHelpers(registry, options.helperOverrides);
	return registry;
}
