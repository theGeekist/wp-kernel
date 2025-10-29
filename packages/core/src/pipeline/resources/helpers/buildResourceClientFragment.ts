import { createHelper } from '../../helper';
import { createClient } from '../../../resource/client';
import type {
	ResourceFragmentHelper,
	ResourceFragmentInput,
	ResourceFragmentKind,
	ResourcePipelineContext,
	ResourcePipelineDraft,
} from '../types';
import { RESOURCE_FRAGMENT_KIND } from '../types';
import type { Reporter } from '../../../reporter/types';

/**
 * Create a fragment helper that instantiates the resource client used by
 * downstream builders and exposes it via the pipeline draft.
 *
 * @example
 * ```ts
 * const clientFragment = buildResourceClientFragment<Post, { id: number }>();
 * pipeline.ir.use(clientFragment);
 * ```
 */
export function buildResourceClientFragment<
	T,
	TQuery,
>(): ResourceFragmentHelper<T, TQuery> {
	return createHelper<
		ResourcePipelineContext<T, TQuery>,
		ResourceFragmentInput<T, TQuery>,
		ResourcePipelineDraft<T, TQuery>,
		Reporter,
		ResourceFragmentKind
	>({
		key: 'resource.client.build',
		kind: RESOURCE_FRAGMENT_KIND,
		dependsOn: ['resource.config.validate'],
		apply: ({ context, output }) => {
			output.client = createClient<T, TQuery>(
				context.config,
				context.reporter,
				{
					namespace: context.namespace,
					resourceName: context.resourceName,
				}
			);
		},
	}) satisfies ResourceFragmentHelper<T, TQuery>;
}
