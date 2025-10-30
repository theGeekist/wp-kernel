import { createHelper } from '../../helper';
import { createActionContext } from '../../../actions/context';
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

export function createActionContextAssembler<
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
		key: 'action.context.assemble',
		kind: ACTION_FRAGMENT_KIND,
		dependsOn: ['action.options.resolve'],
		mode: 'extend',
		priority: 90,
		apply: ({ context }) => {
			if (!context.resolvedOptions) {
				throw new WPKernelError('DeveloperError', {
					message:
						'action.context.assemble requires resolved options before creating an action context.',
				});
			}

			const actionContext = createActionContext(
				context.actionName,
				context.requestId,
				context.resolvedOptions,
				context.reporter
			);

			context.actionContext = actionContext;
			context.reporter = actionContext.reporter;
			context.namespace = actionContext.namespace;
		},
	}) satisfies ActionFragmentHelper<TArgs, TResult>;
}
