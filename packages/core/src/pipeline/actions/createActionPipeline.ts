import { createPipeline } from '../createPipeline';
import { generateActionRequestId } from '../../actions/context';
import { createActionLifecycleFragment } from './helpers/createActionLifecycleFragment';
import { createActionExecutionBuilder } from './helpers/createActionExecutionBuilder';
import { createActionOptionsResolver } from './helpers/createActionOptionsResolver';
import { createActionContextAssembler } from './helpers/createActionContextAssembler';
import { createActionRegistryRecorder } from './helpers/createActionRegistryRecorder';
import type {
	ActionPipeline,
	ActionPipelineContext,
	ActionPipelineOptions,
	ActionPipelineRunResult,
} from './types';
import { ACTION_BUILDER_KIND, ACTION_FRAGMENT_KIND } from './types';
import { getNamespace } from '../../namespace/detect';
import { createReporter as createKernelReporter } from '../../reporter';
import type { Reporter } from '../../reporter/types';

/**
 * Construct the action execution pipeline.
 *
 * The pipeline wires lifecycle fragments, execution builders, and diagnostics
 * so `defineAction` can compose additional helpers over time without rewriting
 * orchestration logic. Callers receive a pipeline instance that encapsulates
 * helper registration and exposes a `run` method mirroring the legacy action
 * flow.
 *
 * @example
 * ```ts
 * const pipeline = createActionPipeline<{ postId: number }, string>();
 *
 * pipeline.ir.use(createHelper({
 *   key: 'action.audit',
 *   kind: ACTION_FRAGMENT_KIND,
 *   apply: ({ reporter, input }) => reporter.info('args', input.args),
 * }));
 *
 * const result = await pipeline.run({
 *   config: actionConfig,
 *   args: { postId: 42 },
 *   definition: {
 *     action: createDefinedAction(),
 *     namespace: 'example/posts',
 *   },
 * });
 *
 * console.log(result.artifact.result);
 * ```
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
			};
		},
		createContext(runOptions): ActionPipelineContext<TArgs, TResult> {
			const requestId = generateActionRequestId();
			const namespace = getNamespace();
			const reporter = resolveReporter(namespace);

			return {
				reporter,
				actionName: runOptions.config.name,
				namespace,
				requestId,
				config: runOptions.config,
				args: runOptions.args,
				definition: runOptions.definition,
				registry: runOptions.registry,
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

	pipeline.ir.use(createActionOptionsResolver<TArgs, TResult>());
	pipeline.ir.use(createActionContextAssembler<TArgs, TResult>());
	pipeline.ir.use(createActionLifecycleFragment<TArgs, TResult>());
	pipeline.builders.use(createActionExecutionBuilder<TArgs, TResult>());
	pipeline.builders.use(createActionRegistryRecorder<TArgs, TResult>());

	return pipeline;
}

function resolveReporter(namespace: string): Reporter {
	const runtime = globalThis.__WP_KERNEL_ACTION_RUNTIME__ as
		| { reporter?: Reporter }
		| undefined;

	if (runtime?.reporter) {
		return runtime.reporter;
	}

	return createKernelReporter({
		namespace,
		channel: 'all',
		level: 'debug',
	});
}
