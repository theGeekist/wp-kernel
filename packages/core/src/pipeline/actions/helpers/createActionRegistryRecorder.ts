import { createHelper } from '@wpkernel/pipeline';
import type {
	ActionBuilderHelper,
	ActionBuilderInput,
	ActionBuilderKind,
	ActionInvocationDraft,
	ActionPipelineContext,
} from '../types';
import { ACTION_BUILDER_KIND } from '../types';
import type { Reporter } from '../../../reporter/types';

export function createActionRegistryRecorder<
	TArgs,
	TResult,
>(): ActionBuilderHelper<TArgs, TResult> {
	return createHelper<
		ActionPipelineContext<TArgs, TResult>,
		ActionBuilderInput<TArgs, TResult>,
		ActionInvocationDraft<TResult>,
		Reporter,
		ActionBuilderKind
	>({
		key: 'action.registry.record',
		kind: ACTION_BUILDER_KIND,
		mode: 'extend',
		priority: 60,
		dependsOn: ['action.execute.handler'],
		apply: async ({ context }, next) => {
			if (next) {
				await next();
			}

			context.registry?.recordActionDefined?.(context.definition);
		},
	}) satisfies ActionBuilderHelper<TArgs, TResult>;
}
