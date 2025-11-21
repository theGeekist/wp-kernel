import type { Reporter } from '@wpkernel/core/reporter';
import { getCliPackageRoot } from '../utils/module-url';
import type { Workspace } from '../workspace';
import {
	assertReadinessRun,
	buildDefaultReadinessRegistry,
	type BuildDefaultReadinessRegistryOptions,
	type DxContext,
	type ReadinessKey,
	type ReadinessRegistry,
} from '../dx';

export interface RunCommandReadinessOptions {
	readonly buildReadinessRegistry?: (
		options?: BuildDefaultReadinessRegistryOptions
	) => ReadinessRegistry;
	readonly registryOptions?: BuildDefaultReadinessRegistryOptions;
	readonly reporter: Reporter;
	readonly workspace: Workspace;
	readonly workspaceRoot: string;
	readonly cwd: string;
	readonly keys: ReadonlyArray<ReadinessKey>;
	readonly scopes?: ReadonlyArray<string>;
	readonly allowDirty?: boolean;
}

function buildContext(
	options: Pick<
		RunCommandReadinessOptions,
		'reporter' | 'workspace' | 'workspaceRoot' | 'cwd' | 'allowDirty'
	>
): DxContext {
	const {
		reporter,
		workspace,
		workspaceRoot,
		cwd,
		allowDirty = false,
	} = options;

	return {
		reporter,
		workspace,
		environment: {
			cwd,
			projectRoot: getCliPackageRoot(),
			workspaceRoot,
			allowDirty,
		},
	} satisfies DxContext;
}

export async function runCommandReadiness(
	options: RunCommandReadinessOptions
): Promise<void> {
	const buildRegistry =
		options.buildReadinessRegistry ?? buildDefaultReadinessRegistry;
	const registry = buildRegistry(options.registryOptions);
	const descriptors = registry.describe();
	const allowedKeys = options.keys.length > 0 ? new Set(options.keys) : null;
	const scopeFilter = options.scopes;
	const orderedKeys = descriptors
		.filter((helper) => {
			if (!scopeFilter || scopeFilter.length === 0) {
				return true;
			}

			const scopes = helper.metadata.scopes;
			if (!scopes || scopes.length === 0) {
				return true;
			}

			return scopeFilter.some((scope) => scopes.includes(scope));
		})
		.map((helper) => helper.key)
		.filter((key) => (allowedKeys ? allowedKeys.has(key) : true));

	const readinessCount = orderedKeys.length;

	if (readinessCount === 0) {
		options.reporter.info('No readiness checks to run.');
		return;
	}

	const label =
		readinessCount === 1
			? 'Running 1 readiness check...'
			: `Running ${readinessCount} readiness checks...`;
	options.reporter.info(label);

	const plan = registry.plan(orderedKeys);
	const context = buildContext(options);
	const result = await plan.run(context);

	assertReadinessRun(result);
	options.reporter.info('Readiness checks completed.');
}
