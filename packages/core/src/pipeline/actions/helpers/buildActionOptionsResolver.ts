import { createHelper } from '../../helper';
import { resolveOptions } from '../../../actions/context';
import type {
	ActionFragmentHelper,
	ActionFragmentKind,
	ActionInvocationDraft,
	ActionLifecycleFragmentInput,
	ActionPipelineContext,
} from '../types';
import { ACTION_FRAGMENT_KIND } from '../types';
import type { Reporter } from '../../../reporter/types';
import type {
	ActionOptions,
	ResolvedActionOptions,
} from '../../../actions/types';

export function resolveActionDefinitionOptions(
	options: ActionOptions | undefined
): ResolvedActionOptions {
	return resolveOptions(options);
}

export function buildActionOptionsResolver<
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
		key: 'action.options.resolve',
		kind: ACTION_FRAGMENT_KIND,
		mode: 'extend',
		priority: 100,
		apply: ({ context, output }) => {
			const resolved = resolveOptions(
				context.config.options as ActionOptions | undefined
			);
			context.resolvedOptions = resolved;
			output.resolvedOptions = resolved;
		},
	}) satisfies ActionFragmentHelper<TArgs, TResult>;
}
