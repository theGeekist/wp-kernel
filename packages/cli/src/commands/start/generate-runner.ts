import type { Reporter } from '@wpkernel/core/reporter';
import type {
	BuildGenerateCommandOptions,
	GenerateResult,
} from '../generate/types';
import { buildGenerateDependencies } from '../generate/dependencies';
import { runGenerateWorkflow } from '../generate';

/**
 * A function type that represents a runner for the WPKernel generate workflow.
 *
 * This abstraction allows the `start` command to trigger artifact generation
 * without directly depending on the `generate` command's implementation details.
 *
 * @category CLI Helpers
 */
export type GenerateRunner = (options: {
	readonly reporter: Reporter;
	readonly verbose: boolean;
	readonly cwd: string;
	readonly allowDirty?: boolean;
}) => Promise<GenerateResult>;

export function createGenerateRunner(
	options: BuildGenerateCommandOptions = {}
): GenerateRunner {
	const dependencies = buildGenerateDependencies(options);
	return async ({ reporter, verbose, cwd, allowDirty }) =>
		runGenerateWorkflow({
			dependencies,
			reporter,
			dryRun: false,
			verbose,
			cwd,
			allowDirty: allowDirty === true,
		});
}
