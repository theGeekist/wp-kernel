import type {
	Reporter,
	ReporterLevel,
	ReporterOptions,
} from '@wpkernel/core/reporter';
import { type KernelError } from '@wpkernel/core/error';
import type { Command } from 'clipanion';
import type { Workspace } from '../../workspace';
import type { InitWorkflowOptions, InitWorkflowResult } from './workflow';
import { parseStringOption } from './utils';

export interface InitCommandRuntimeDependencies {
	readonly buildWorkspace: (root: string) => Workspace;
	readonly buildReporter: (options: ReporterOptions) => Reporter;
	readonly runWorkflow: (
		options: InitWorkflowOptions
	) => Promise<InitWorkflowResult>;
}

export interface InitCommandRuntimeOptions {
	readonly reporterNamespace: string;
	readonly reporterLevel?: ReporterLevel;
	readonly reporterEnabled?: boolean;
	readonly workspaceRoot: string;
	readonly projectName?: string | null;
	readonly template?: string | null;
	readonly force?: boolean;
	readonly verbose?: boolean;
	readonly preferRegistryVersions?: boolean;
	readonly env?: InitWorkflowOptions['env'];
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
	runWorkflow: () => Promise<InitWorkflowResult>;
}

export function createInitCommandRuntime(
	dependencies: InitCommandRuntimeDependencies,
	options: InitCommandRuntimeOptions
): InitCommandRuntimeResult {
	const reporter = dependencies.buildReporter({
		namespace: options.reporterNamespace,
		level: options.reporterLevel ?? 'info',
		enabled:
			typeof options.reporterEnabled === 'boolean'
				? options.reporterEnabled
				: process.env.NODE_ENV !== 'test',
	});

	const workspace = dependencies.buildWorkspace(options.workspaceRoot);

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
		runWorkflow: () => dependencies.runWorkflow(workflowOptions),
	};
}

export function formatInitWorkflowError(
	command: string,
	error: KernelError
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
