import { createHelper } from '../../helper';
import {
	createActionLifecycleEvent,
	normalizeActionError,
} from '../../../actions/lifecycle';
import { emitLifecycleEvent } from '../../../actions/context';
import type { Reporter } from '../../../reporter/types';
import type {
	ActionBuilderHelper,
	ActionBuilderInput,
	ActionInvocationDraft,
	ActionPipelineContext,
} from '../types';
import { measureDurationMs, readMonotonicTime } from './timing';

/**
 * Build the execution-stage helper responsible for invoking the user supplied
 * action handler and translating the outcome into lifecycle events.
 *
 * The helper records timing metadata, ensures downstream builder failures are
 * normalised, and emits matching `complete`/`error` lifecycle events once the
 * entire builder chain settles.
 */
export function buildActionExecutionBuilder<
	TArgs,
	TResult,
>(): ActionBuilderHelper<TArgs, TResult> {
	return createHelper<
		ActionPipelineContext,
		ActionBuilderInput<TArgs, TResult>,
		ActionInvocationDraft<TResult>,
		Reporter,
		'core.action.builder'
	>({
		key: 'action.execute.handler',
		kind: 'core.action.builder',
		apply: async ({ context, input, output }, next) => {
			const start = output.startTime ?? readMonotonicTime();

			try {
				const result = await input.handler(
					context.actionContext,
					input.args
				);
				output.result = result;

				if (next) {
					await next();
				}

				const duration = measureDurationMs(start);
				output.durationMs = duration;
				const completeEvent = createActionLifecycleEvent(
					'complete',
					context.resolvedOptions,
					context.actionName,
					context.requestId,
					context.namespace,
					{ result, durationMs: duration }
				);
				emitLifecycleEvent(completeEvent);
			} catch (error) {
				const normalized = normalizeActionError(
					error,
					context.actionName,
					context.requestId
				);
				const duration = measureDurationMs(start);
				output.error = normalized;
				delete output.result;
				output.durationMs = duration;
				const errorEvent = createActionLifecycleEvent(
					'error',
					context.resolvedOptions,
					context.actionName,
					context.requestId,
					context.namespace,
					{ error: normalized, durationMs: duration }
				);
				emitLifecycleEvent(errorEvent);
				throw normalized;
			}
		},
	});
}
