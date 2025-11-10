import path from 'node:path';
import type { RunProcessResult } from '@wpkernel/test-utils/integration';
import { runWpk } from './runWpk';
import {
	withWorkspace,
	type WorkspaceOptions,
} from '../workspace.test-support';

type RunCliOptions = {
	env?: NodeJS.ProcessEnv;
};

type RunCliCommand = (
	args: string[],
	options?: RunCliOptions
) => Promise<RunProcessResult>;

type ExpectInitOptions = RunCliOptions & {
	readonly args?: readonly string[];
};

export interface CliIntegrationHarnessContext {
	readonly workspace: string;
	readonly run: RunCliCommand;
	readonly fromWorkspace: (...segments: readonly string[]) => string;
	readonly expectSuccessfulInit: (
		pluginName: string,
		options?: ExpectInitOptions
	) => Promise<RunProcessResult>;
}

export interface CliIntegrationHarnessOptions {
	readonly workspace?: WorkspaceOptions;
}

export async function withCliIntegration(
	run: (context: CliIntegrationHarnessContext) => Promise<void>,
	options: CliIntegrationHarnessOptions = {}
): Promise<void> {
	const { workspace: workspaceOptions } = options;

	await withWorkspace(
		async (workspace) => {
			const fromWorkspace = (...segments: readonly string[]): string =>
				path.join(workspace, ...segments);

			const runCommand: RunCliCommand = (args, runOptions = {}) =>
				runWpk(workspace, args, runOptions);

			const expectSuccessfulInit: CliIntegrationHarnessContext['expectSuccessfulInit'] =
				async (pluginName, initOptions = {}) => {
					const { env, args: extraArgs = [] } = initOptions;
					const result = await runCommand(
						['init', '--name', pluginName, ...extraArgs],
						{ env }
					);

					expect(result.code).toBe(0);
					expect(result.stderr).toBe('');

					return result;
				};

			await run({
				workspace,
				run: runCommand,
				fromWorkspace,
				expectSuccessfulInit,
			});
		},
		{ chdir: false, ...(workspaceOptions ?? {}) }
	);
}
