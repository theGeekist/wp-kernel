import type { Reporter } from '@wpkernel/core/reporter';
import { getCliPackageRoot } from '../utils/module-url';
import type { Workspace } from '../workspace';
import {
	assertReadinessRun,
	buildDefaultReadinessRegistry,
	DEFAULT_READINESS_ORDER,
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
			flags: {
				forceSource: process.env.WPK_CLI_FORCE_SOURCE === '1',
			},
		},
	} satisfies DxContext;
}

function resolveKeys(
	keys: ReadonlyArray<ReadinessKey>
): ReadonlyArray<ReadinessKey> {
	const allowed = new Set(keys);
	return DEFAULT_READINESS_ORDER.filter((key) => allowed.has(key));
}

export async function runCommandReadiness(
	options: RunCommandReadinessOptions
): Promise<void> {
	const orderedKeys = resolveKeys(options.keys);
	if (orderedKeys.length === 0) {
		return;
	}

	const buildRegistry =
		options.buildReadinessRegistry ?? buildDefaultReadinessRegistry;
	const registry = buildRegistry(options.registryOptions);
	const plan = registry.plan(orderedKeys);
	const context = buildContext(options);
	const result = await plan.run(context);

	assertReadinessRun(result);
}
