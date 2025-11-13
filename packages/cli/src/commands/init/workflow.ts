import type { InitWorkflowOptions, InitWorkflowResult } from './types';
import { runInitPipeline } from './pipeline';

export type { InitWorkflowOptions, InitWorkflowResult } from './types';

export async function runInitWorkflow(
	options: InitWorkflowOptions
): Promise<InitWorkflowResult> {
	return runInitPipeline(options);
}
