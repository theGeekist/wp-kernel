import { createPipeline } from '../createPipeline';
import {
	createActionContext,
	generateActionRequestId,
} from '../../actions/context';
import { buildActionLifecycleFragment } from './helpers/buildActionLifecycleFragment';
import { buildActionExecutionBuilder } from './helpers/buildActionExecutionBuilder';
import type {
	ActionPipeline,
	ActionPipelineOptions,
	ActionPipelineRunResult,
} from './types';
import { ACTION_BUILDER_KIND, ACTION_FRAGMENT_KIND } from './types';

/**
 * Construct the action execution pipeline.
 *
 * The pipeline wires lifecycle fragments, execution builders, and diagnostics
 * so `defineAction` can compose additional helpers over time without rewriting
 * orchestration logic. Callers receive a pipeline instance that encapsulates
 * helper registration and exposes a `run` method mirroring the legacy action
 * flow.
 */
export function createActionPipeline<TArgs, TResult>(): ActionPipeline<
	TArgs,
	TResult
> {
	const pipelineOptions = {
		fragmentKind: ACTION_FRAGMENT_KIND,
		builderKind: ACTION_BUILDER_KIND,
		createBuildOptions(runOptions) {
			return {
				config: runOptions.config,
				resolvedOptions: runOptions.resolvedOptions,
			};
		},
		createContext(runOptions) {
			const requestId = generateActionRequestId();
			const actionContext = createActionContext(
				runOptions.config.name,
				requestId,
				runOptions.resolvedOptions
			);

			return {
				reporter: actionContext.reporter,
				actionName: runOptions.config.name,
				namespace: actionContext.namespace,
				resolvedOptions: runOptions.resolvedOptions,
				requestId,
				actionContext,
			};
		},
		createFragmentState() {
			return {};
		},
		createFragmentArgs({ options, context, draft }) {
			return {
				context,
				input: { args: options.args },
				output: draft,
				reporter: context.reporter,
			};
		},
		finalizeFragmentState({ draft }) {
			return draft;
		},
		createBuilderArgs({ options, context, artifact }) {
			return {
				context,
				input: {
					args: options.args,
					handler: options.config.handler,
				},
				output: artifact,
				reporter: context.reporter,
			};
		},
		createRunResult({ artifact, diagnostics, steps }) {
			return {
				artifact,
				diagnostics,
				steps,
			} satisfies ActionPipelineRunResult<TResult>;
		},
	} satisfies ActionPipelineOptions<TArgs, TResult>;

	const pipeline: ActionPipeline<TArgs, TResult> =
		createPipeline(pipelineOptions);

	pipeline.ir.use(buildActionLifecycleFragment<TArgs, TResult>());
	pipeline.builders.use(buildActionExecutionBuilder<TArgs, TResult>());

	return pipeline;
}
