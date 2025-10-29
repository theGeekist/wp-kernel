import { createHelper } from '../../helper';
import { createActionLifecycleEvent } from '../../../actions/lifecycle';
import { emitLifecycleEvent } from '../../../actions/context';
import { WPKernelError } from '../../../error/WPKernelError';
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
 *
 * @example
 * ```ts
 * const lifecycleFragment = buildActionLifecycleFragment<{ id: string }, string>();
 * pipeline.ir.use(lifecycleFragment);
 * ```
 */
export function buildActionLifecycleFragment<
	TArgs,
	TResult,
>(): ActionFragmentHelper<TArgs, TResult> {
	return createHelper<
		ActionPipelineContext<TArgs, TResult>,
		ActionLifecycleFragmentInput<TArgs>,
		ActionInvocationDraft<TResult>,
		Reporter,
		ActionFragmentKind
	>({
		key: 'action.lifecycle.initialize',
		kind: ACTION_FRAGMENT_KIND,
		mode: 'extend',
		priority: 80,
		dependsOn: ['action.context.assemble'],
		apply: async ({ context, input, output }) => {
			if (!context.resolvedOptions) {
				throw new WPKernelError('DeveloperError', {
					message:
						'action.lifecycle.initialize requires resolved options. Ensure action.options.resolve runs first.',
				});
			}
			if (!context.actionContext) {
				throw new WPKernelError('DeveloperError', {
					message:
						'action.lifecycle.initialize requires an action context. Ensure action.context.assemble runs first.',
				});
			}
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
