import type { InitWorkflowOptions, InitWorkflowResult } from './types';
import { runInitPipeline } from './pipeline';
import {
	installComposerDependencies,
	installNodeDependencies,
} from './installers';

export type { InitWorkflowOptions, InitWorkflowResult } from './types';

export async function runInitWorkflow(
	options: InitWorkflowOptions
): Promise<InitWorkflowResult> {
	const {
		installers: installerOverrides,
		installDependencies,
		packageManager = 'npm',
		...baseOptions
	} = options;

	const installers = {
		installNodeDependencies,
		installComposerDependencies,
		...installerOverrides,
	};

	return runInitPipeline({
		...baseOptions,
		packageManager,
		installDependencies: installDependencies === true,
		installers,
	});
}
