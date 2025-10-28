import { createHelper } from '../../helper';
import { createActionLifecycleEvent } from '../../../actions/lifecycle';
import { emitLifecycleEvent } from '../../../actions/context';
import type {
	ActionFragmentHelper,
	ActionFragmentKind,
	ActionInvocationDraft,
	ActionLifecycleFragmentInput,
	ActionPipelineContext,
} from '../types';
import { ACTION_FRAGMENT_KIND } from '../types';
import type { Reporter } from '../../../reporter/types';
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
		ActionFragmentKind
	>({
		key: 'action.lifecycle.initialize',
		kind: ACTION_FRAGMENT_KIND,
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
	}) satisfies ActionFragmentHelper<TArgs, TResult>;
}
