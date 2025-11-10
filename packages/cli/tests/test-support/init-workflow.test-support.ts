import { createReporterMock } from '@wpkernel/test-utils/cli';
import {
	withWorkspace,
	type WorkspaceOptions,
} from '../workspace.test-support';
import { buildWorkspace } from '../../src/workspace';
import { runInitWorkflow } from '../../src/commands/init/workflow';
import type {
	InitWorkflowOptions,
	InitWorkflowResult,
} from '../../src/commands/init/workflow';

export interface InitWorkflowHarnessOptions {
	readonly workspace?: WorkspaceOptions;
	readonly defaults?: Partial<
		Omit<InitWorkflowOptions, 'workspace' | 'reporter'>
	>;
	readonly reporterFactory?: () => ReturnType<typeof createReporterMock>;
}

export interface InitWorkflowHarnessContext {
	readonly workspaceRoot: string;
	readonly workspace: ReturnType<typeof buildWorkspace>;
	readonly reporter: ReturnType<typeof createReporterMock>;
	readonly run: (
		overrides?: Partial<Omit<InitWorkflowOptions, 'workspace' | 'reporter'>>
	) => Promise<InitWorkflowResult>;
}

export async function withInitWorkflowHarness(
	run: (context: InitWorkflowHarnessContext) => Promise<void>,
	options: InitWorkflowHarnessOptions = {}
): Promise<void> {
	const {
		workspace: workspaceOptions,
		defaults: defaultOverrides = {},
		reporterFactory = createReporterMock,
	} = options;

	const { env: defaultEnv, ...baseDefaults } = defaultOverrides;

	await withWorkspace(
		async (workspaceRoot) => {
			const workspace = buildWorkspace(workspaceRoot);
			const reporter = reporterFactory();

			const runWorkflow = async (
				overrides: Partial<
					Omit<InitWorkflowOptions, 'workspace' | 'reporter'>
				> = {}
			): Promise<InitWorkflowResult> => {
				const { env: overrideEnv, ...overrideDefaults } = overrides;
				const env = {
					...(defaultEnv ?? {}),
					...(overrideEnv ?? {}),
				} satisfies InitWorkflowOptions['env'];

				return runInitWorkflow({
					workspace,
					reporter,
					...baseDefaults,
					...overrideDefaults,
					env,
				});
			};

			await run({
				workspaceRoot,
				workspace,
				reporter,
				run: runWorkflow,
			});
		},
		{ chdir: false, ...(workspaceOptions ?? {}) }
	);
}
