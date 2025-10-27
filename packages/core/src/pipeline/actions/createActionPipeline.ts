import { createPipeline } from '../createPipeline';
import type { PipelineDiagnostic } from '../types';
import {
	createActionContext,
	generateActionRequestId,
} from '../../actions/context';
import type { Reporter } from '../../reporter/types';
import { buildActionLifecycleFragment } from './helpers/buildActionLifecycleFragment';
import { buildActionExecutionBuilder } from './helpers/buildActionExecutionBuilder';
import type {
	ActionBuilderHelper,
	ActionBuilderInput,
	ActionFragmentHelper,
	ActionInvocationDraft,
	ActionLifecycleFragmentInput,
	ActionPipelineArtifact,
	ActionPipelineBuildOptions,
	ActionPipelineContext,
	ActionPipelineRunOptions,
	ActionPipelineRunResult,
} from './types';

export function createActionPipeline<TArgs, TResult>() {
	const pipeline = createPipeline<
		ActionPipelineRunOptions<TArgs, TResult>,
		ActionPipelineBuildOptions<TArgs, TResult>,
		ActionPipelineContext,
		Reporter,
		ActionInvocationDraft<TResult>,
		ActionPipelineArtifact<TResult>,
		PipelineDiagnostic,
		ActionPipelineRunResult<TResult>,
		ActionLifecycleFragmentInput<TArgs>,
		ActionInvocationDraft<TResult>,
		ActionBuilderInput<TArgs, TResult>,
		ActionInvocationDraft<TResult>,
		'core.action.fragment',
		'core.action.builder',
		ActionFragmentHelper<TArgs, TResult>,
		ActionBuilderHelper<TArgs, TResult>
	>({
		fragmentKind: 'core.action.fragment',
		builderKind: 'core.action.builder',
		createBuildOptions(runOptions) {
			return {
				config: runOptions.config,
				resolvedOptions: runOptions.resolvedOptions,
			} satisfies ActionPipelineBuildOptions<TArgs, TResult>;
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
			} satisfies ActionPipelineContext;
		},
		createFragmentState() {
			return {} as ActionInvocationDraft<TResult>;
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
	});

	pipeline.ir.use(buildActionLifecycleFragment<TArgs, TResult>());
	pipeline.builders.use(buildActionExecutionBuilder<TArgs, TResult>());

	return pipeline;
}
