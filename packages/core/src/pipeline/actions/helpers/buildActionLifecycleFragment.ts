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
import { readMonotonicTime } from './timing';

/**
 * Create the fragment helper that initialises action execution state.
 *
 * The helper captures the invocation start time and immediately emits the
 * `action.start` lifecycle event so observers receive argument metadata before
 * any builders run.
 */
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
			output.startTime = readMonotonicTime();
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
