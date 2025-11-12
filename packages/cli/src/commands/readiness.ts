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
}

function buildContext(
	options: Pick<
		RunCommandReadinessOptions,
		'reporter' | 'workspace' | 'workspaceRoot' | 'cwd'
	>
): DxContext {
	const { reporter, workspace, workspaceRoot, cwd } = options;

	return {
		reporter,
		workspace,
		environment: {
			cwd,
			projectRoot: getCliPackageRoot(),
			workspaceRoot,
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

	if (orderedKeys.length === 0) {
		return;
	}

	const plan = registry.plan(orderedKeys);
	const context = buildContext(options);
	const result = await plan.run(context);

	assertReadinessRun(result);
}
