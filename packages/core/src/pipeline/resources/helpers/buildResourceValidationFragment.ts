import { createHelper } from '../../helper';
import { validateConfig } from '../../../resource/validation';
import { RESOURCE_LOG_MESSAGES } from '../../../resource/logMessages';
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
 * Create a fragment helper that validates resource configuration and records
 * a diagnostic log entry describing the configured routes.
 *
 * @example
 * ```ts
 * const validation = buildResourceValidationFragment<Post, { id: number }>();
 * pipeline.ir.use(validation);
 * ```
 */
export function buildResourceValidationFragment<
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
		key: 'resource.config.validate',
		kind: RESOURCE_FRAGMENT_KIND,
		apply: ({ context }) => {
			validateConfig(context.normalizedConfig);
			context.reporter.info(RESOURCE_LOG_MESSAGES.define, {
				namespace: context.namespace,
				resource: context.resourceName,
				routes: Object.keys(context.config.routes ?? {}),
				hasCacheKeys: Boolean(context.config.cacheKeys),
			});
		},
	}) satisfies ResourceFragmentHelper<T, TQuery>;
}
