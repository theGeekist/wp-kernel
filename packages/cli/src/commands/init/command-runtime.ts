import type {
	Reporter,
	ReporterLevel,
	ReporterOptions,
} from '@wpkernel/core/reporter';
import { type WPKernelError } from '@wpkernel/core/error';
import type { Command } from 'clipanion';
import type { Workspace } from '../../workspace';
import type { InitWorkflowOptions, InitWorkflowResult } from './workflow';
import { parseStringOption } from './utils';
import {
	type BuildDefaultReadinessRegistryOptions,
	type ReadinessRegistry,
	type ReadinessKey,
	type ReadinessPlan,
	type ReadinessRunResult,
	type DxContext,
	type ReadinessHelperDescriptor,
	buildDefaultReadinessRegistry,
} from '../../dx';
import { getCliPackageRoot } from '../../utils/module-url';

export interface InitCommandRuntimeDependencies {
	readonly buildWorkspace: (root: string) => Workspace;
	readonly buildReporter: (options: ReporterOptions) => Reporter;
	readonly runWorkflow: (
		options: InitWorkflowOptions
	) => Promise<InitWorkflowResult>;
	readonly buildReadinessRegistry?: (
		options?: BuildDefaultReadinessRegistryOptions
	) => ReadinessRegistry;
}

export interface InitCommandRuntimeOptions {
	readonly reporterNamespace: string;
	readonly reporterLevel?: ReporterLevel;
	readonly reporterEnabled?: boolean;
	readonly workspaceRoot: string;
	readonly cwd?: string;
	readonly projectName?: string | null;
	readonly template?: string | null;
	readonly force?: boolean;
	readonly verbose?: boolean;
	readonly preferRegistryVersions?: boolean;
	readonly env?: InitWorkflowOptions['env'];
	readonly readiness?: BuildDefaultReadinessRegistryOptions;
}

export interface InitCommandRuntimeResult {
	readonly workspace: Workspace;
	readonly reporter: Reporter;
	readonly workflowOptions: InitWorkflowOptions;
	readonly resolved: {
		readonly projectName?: string;
		readonly template?: string;
		readonly force: boolean;
		readonly verbose: boolean;
		readonly preferRegistryVersions: boolean;
	};
	readonly readiness: InitCommandReadinessRuntime;
	runWorkflow: () => Promise<InitWorkflowResult>;
}

export interface InitCommandReadinessRuntime {
	readonly registry: ReadinessRegistry;
	readonly context: DxContext;
	readonly defaultKeys: ReadonlyArray<ReadinessKey>;
	readonly helpers: ReadonlyArray<ReadinessHelperDescriptor>;
	readonly plan: (keys: readonly ReadinessKey[]) => ReadinessPlan;
	readonly run: (
		keys: readonly ReadinessKey[]
	) => Promise<ReadinessRunResult>;
}

function helperIncludesScope(
	helper: ReadinessHelperDescriptor,
	scope: string
): boolean {
	const scopes = helper.metadata.scopes;
	if (!scopes || scopes.length === 0) {
		return true;
	}

	return scopes.includes(scope);
}

export function createInitCommandRuntime(
	dependencies: InitCommandRuntimeDependencies,
	options: InitCommandRuntimeOptions
): InitCommandRuntimeResult {
	const buildReadinessRegistry =
		dependencies.buildReadinessRegistry ?? buildDefaultReadinessRegistry;

	const reporter = dependencies.buildReporter({
		namespace: options.reporterNamespace,
		level: options.reporterLevel ?? 'info',
		enabled:
			typeof options.reporterEnabled === 'boolean'
				? options.reporterEnabled
				: process.env.NODE_ENV !== 'test',
	});

	const workspace = dependencies.buildWorkspace(options.workspaceRoot);
	const cwd = resolveCwd(options);

	const projectName = parseStringOption(options.projectName);
	const template = parseStringOption(options.template);
	const force = options.force === true;
	const verbose = options.verbose === true;
	const preferRegistryVersions = options.preferRegistryVersions === true;

	const workflowOptions: InitWorkflowOptions = {
		workspace,
		reporter,
		projectName,
		template,
		force,
		verbose,
		preferRegistryVersionsFlag: preferRegistryVersions,
		env: options.env ?? {
			WPK_PREFER_REGISTRY_VERSIONS:
				process.env.WPK_PREFER_REGISTRY_VERSIONS,
			REGISTRY_URL: process.env.REGISTRY_URL,
		},
	};

	const readinessRegistry = buildReadinessRegistry(options.readiness);
	const readinessContext: DxContext = {
		reporter,
		workspace,
		environment: {
			cwd,
			projectRoot: getCliPackageRoot(),
			workspaceRoot: options.workspaceRoot,
		},
	};

	const helperDescriptors = readinessRegistry.describe();
	const defaultKeys = helperDescriptors
		.filter((helper) => helperIncludesScope(helper, 'init'))
		.map((helper) => helper.key);

	const readinessRuntime: InitCommandReadinessRuntime = {
		registry: readinessRegistry,
		context: readinessContext,
		defaultKeys,
		helpers: helperDescriptors,
		plan: (keys) => readinessRegistry.plan(keys),
		run: (keys) => readinessRegistry.plan(keys).run(readinessContext),
	};

	return {
		workspace,
		reporter,
		workflowOptions,
		resolved: {
			projectName,
			template,
			force,
			verbose,
			preferRegistryVersions,
		},
		readiness: readinessRuntime,
		runWorkflow: () => dependencies.runWorkflow(workflowOptions),
	};
}

function resolveCwd(options: InitCommandRuntimeOptions): string {
	if (typeof options.cwd === 'string' && options.cwd.length > 0) {
		return options.cwd;
	}

	return options.workspaceRoot;
}

export function formatInitWorkflowError(
	command: string,
	error: WPKernelError
): string {
	const collisions = Array.isArray(
		(error.data as { collisions?: unknown })?.collisions
	)
		? ((error.data as { collisions?: string[] }).collisions ?? [])
		: [];

	const lines = [`[wpk] ${command} failed: ${error.message}`];

	if (collisions.length > 0) {
		lines.push('Conflicting files:');
		for (const file of collisions) {
			lines.push(`  - ${file}`);
		}
	}

	const pathEntry = (error.data as { path?: unknown })?.path;
	if (typeof pathEntry === 'string' && pathEntry.length > 0) {
		lines.push(`  - ${pathEntry}`);
	}

	return `${lines.join('\n')}\n`;
}

export function resolveCommandCwd(context: Command['context']): string {
	const cwd = (context as { cwd?: () => string }).cwd;
	return typeof cwd === 'function' ? cwd() : process.cwd();
}
