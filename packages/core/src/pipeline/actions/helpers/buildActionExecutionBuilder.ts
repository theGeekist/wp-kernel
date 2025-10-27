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

function getTimestamp(): number {
	const perf = globalThis.performance;
	if (perf && typeof perf.now === 'function') {
		return perf.now();
	}

	return Date.now();
}

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
			const start = output.startTime ?? getTimestamp();

			try {
				const result = await input.handler(
					context.actionContext,
					input.args
				);
				const duration = getTimestamp() - start;
				output.result = result;
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
				const duration = getTimestamp() - start;
				output.error = normalized;
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

			if (next) {
				await next();
			}
		},
	});
}
