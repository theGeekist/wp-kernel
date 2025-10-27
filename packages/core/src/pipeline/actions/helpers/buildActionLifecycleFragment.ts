import { createHelper } from '../../helper';
import { createActionLifecycleEvent } from '../../../actions/lifecycle';
import { emitLifecycleEvent } from '../../../actions/context';
import type { Reporter } from '../../../reporter/types';
import type {
	ActionFragmentHelper,
	ActionInvocationDraft,
	ActionLifecycleFragmentInput,
	ActionPipelineContext,
} from '../types';

function getTimestamp(): number {
	const perf = globalThis.performance;
	if (perf && typeof perf.now === 'function') {
		return perf.now();
	}

	return Date.now();
}

export function buildActionLifecycleFragment<
	TArgs,
	TResult,
>(): ActionFragmentHelper<TArgs, TResult> {
	return createHelper<
		ActionPipelineContext,
		ActionLifecycleFragmentInput<TArgs>,
		ActionInvocationDraft<TResult>,
		Reporter,
		'core.action.fragment'
	>({
		key: 'action.lifecycle.initialize',
		kind: 'core.action.fragment',
		apply: async ({ context, input, output }) => {
			output.startTime = getTimestamp();
			const startEvent = createActionLifecycleEvent(
				'start',
				context.resolvedOptions,
				context.actionName,
				context.requestId,
				context.namespace,
				{ args: input.args }
			);
			emitLifecycleEvent(startEvent);
		},
	});
}
