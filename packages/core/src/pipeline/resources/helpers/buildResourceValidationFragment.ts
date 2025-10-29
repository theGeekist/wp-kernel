import { createHelper } from '../../helper';
import { validateConfig } from '../../../resource/validation';
import { RESOURCE_LOG_MESSAGES } from '../../../resource/logMessages';
import { WPKernelError } from '../../../error/WPKernelError';
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
		dependsOn: ['resource.namespace.resolve', 'resource.reporter.resolve'],
		apply: ({ context }) => {
			if (!context.normalizedConfig) {
				throw new WPKernelError('DeveloperError', {
					message:
						'Resource configuration validation requires a normalized config. Ensure resource.namespace.resolve runs first.',
				});
			}

			if (!context.namespace || !context.resourceName) {
				throw new WPKernelError('DeveloperError', {
					message:
						'Resource configuration validation requires namespace and resource name metadata. Ensure resource.namespace.resolve runs first.',
				});
			}

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
