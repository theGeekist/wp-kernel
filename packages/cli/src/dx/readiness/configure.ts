import { createReadinessRegistry, type ReadinessRegistry } from './registry';
import type { ReadinessKey } from './types';
import {
	createComposerReadinessHelper,
	createGitReadinessHelper,
	createPhpDriverReadinessHelper,
	createPhpRuntimeReadinessHelper,
	createReleasePackReadinessHelper,
	createTsxRuntimeReadinessHelper,
	createWorkspaceHygieneReadinessHelper,
	type ComposerHelperOverrides,
	type GitHelperDependencies,
	type PhpDriverDependencies,
	type PhpRuntimeDependencies,
	type ReleasePackHelperOptions,
	type TsxRuntimeDependencies,
	type WorkspaceHygieneDependencies,
} from './helpers';

export interface DefaultReadinessHelperOverrides {
	readonly git?: Partial<GitHelperDependencies>;
	readonly composer?: ComposerHelperOverrides;
	readonly phpRuntime?: Partial<PhpRuntimeDependencies>;
	readonly phpDriver?: Partial<PhpDriverDependencies>;
	readonly tsxRuntime?: Partial<TsxRuntimeDependencies>;
	readonly workspaceHygiene?: Partial<WorkspaceHygieneDependencies>;
	readonly releasePack?: ReleasePackHelperOptions;
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
	'tsx-runtime',
	'release-pack',
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
	registry.register(createTsxRuntimeReadinessHelper(overrides.tsxRuntime));
	registry.register(createReleasePackReadinessHelper(overrides.releasePack));
}

export function buildDefaultReadinessRegistry(
	options: BuildDefaultReadinessRegistryOptions = {}
): ReadinessRegistry {
	const registry = createReadinessRegistry();
	registerDefaultReadinessHelpers(registry, options.helperOverrides);
	return registry;
}
