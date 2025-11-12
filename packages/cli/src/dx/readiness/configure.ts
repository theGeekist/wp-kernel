import { createReadinessHelper } from './helper';
import { createReadinessRegistry, type ReadinessRegistry } from './registry';
import type { ReadinessHelper, ReadinessKey } from './types';
import {
	createComposerReadinessHelper,
	createGitReadinessHelper,
	createPhpCodemodIngestionReadinessHelper,
	createPhpDriverReadinessHelper,
	createPhpPrinterPathReadinessHelper,
	createPhpRuntimeReadinessHelper,
	createBootstrapperResolutionReadinessHelper,
	createReleasePackReadinessHelper,
	createTsxRuntimeReadinessHelper,
	createWorkspaceHygieneReadinessHelper,
	type ComposerHelperOverrides,
	type GitHelperDependencies,
	type PhpCodemodIngestionDependencies,
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
	readonly phpCodemodIngestion?: Partial<PhpCodemodIngestionDependencies>;
	readonly phpPrinterPath?: Partial<PhpPrinterPathDependencies>;
	readonly tsxRuntime?: Partial<TsxRuntimeDependencies>;
	readonly workspaceHygiene?: Partial<WorkspaceHygieneDependencies>;
	readonly releasePack?: ReleasePackHelperOptions;
	readonly bootstrapperResolution?: BootstrapperResolutionHelperOptions;
	readonly quickstart?: QuickstartHelperOptions;
}

export interface BuildDefaultReadinessRegistryOptions {
	readonly helperOverrides?: DefaultReadinessHelperOverrides;
	readonly helperFactories?: ReadonlyArray<ReadinessHelperFactory>;
}

export interface ReadinessHelperFactoryContext {
	readonly registry: ReadinessRegistry;
	readonly register: (helper: ReadinessHelper) => void;
	readonly createHelper: typeof createReadinessHelper;
}

export type ReadinessHelperFactory = (
	context: ReadinessHelperFactoryContext
) => void | ReadinessHelper | ReadonlyArray<ReadinessHelper>;

function invokeReadinessHelperFactory(
	registry: ReadinessRegistry,
	factory: ReadinessHelperFactory
): void {
	const register = (helper: ReadinessHelper) => {
		registry.register(helper);
	};

	const result = factory({
		registry,
		register,
		createHelper: createReadinessHelper,
	});

	if (!result) {
		return;
	}

	const helpers = Array.isArray(result) ? result : [result];
	for (const helper of helpers) {
		registry.register(helper);
	}
}

export function registerReadinessHelperFactories(
	registry: ReadinessRegistry,
	factories: Iterable<ReadinessHelperFactory>
): void {
	for (const factory of factories) {
		invokeReadinessHelperFactory(registry, factory);
	}
}

function createDefaultReadinessHelpers(
	overrides: DefaultReadinessHelperOverrides = {}
): ReadonlyArray<ReadinessHelper<unknown>> {
	return [
		createWorkspaceHygieneReadinessHelper(overrides.workspaceHygiene),
		createGitReadinessHelper(overrides.git),
		createComposerReadinessHelper(overrides.composer),
		createPhpRuntimeReadinessHelper(overrides.phpRuntime),
		createPhpDriverReadinessHelper(overrides.phpDriver),
		createPhpCodemodIngestionReadinessHelper(overrides.phpCodemodIngestion),
		createPhpPrinterPathReadinessHelper(overrides.phpPrinterPath),
		createTsxRuntimeReadinessHelper(overrides.tsxRuntime),
		createReleasePackReadinessHelper(overrides.releasePack),
		createBootstrapperResolutionReadinessHelper(
			overrides.bootstrapperResolution
		),
		createQuickstartReadinessHelper(overrides.quickstart),
	] as ReadonlyArray<ReadinessHelper<unknown>>;
}

export const DEFAULT_READINESS_ORDER: ReadonlyArray<ReadinessKey> =
	Object.freeze(createDefaultReadinessHelpers().map((helper) => helper.key));

export function registerDefaultReadinessHelpers(
	registry: ReadinessRegistry,
	overrides: DefaultReadinessHelperOverrides = {}
): void {
	for (const helper of createDefaultReadinessHelpers(overrides)) {
		registry.register(helper);
	}
}

export function buildDefaultReadinessRegistry(
	options: BuildDefaultReadinessRegistryOptions = {}
): ReadinessRegistry {
	const registry = createReadinessRegistry();
	registerDefaultReadinessHelpers(registry, options.helperOverrides);
	if (options.helperFactories && options.helperFactories.length > 0) {
		registerReadinessHelperFactories(registry, options.helperFactories);
	}
	return registry;
}
