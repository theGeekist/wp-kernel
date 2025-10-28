import { createHelper } from '../../helper';
import { validateConfig } from '../../../resource/validation';
import { RESOURCE_LOG_MESSAGES } from '../../../resource/logMessages';
import type { ResourceFragmentHelper } from '../types';

export function buildResourceValidationFragment<
	T,
	TQuery,
>(): ResourceFragmentHelper<T, TQuery> {
	return createHelper({
		key: 'resource.config.validate',
		kind: 'core.resource.fragment',
		apply: ({ context }) => {
			validateConfig(context.normalizedConfig);
			context.reporter.info(RESOURCE_LOG_MESSAGES.define, {
				namespace: context.namespace,
				resource: context.resourceName,
				routes: Object.keys(context.config.routes ?? {}),
				hasCacheKeys: Boolean(context.config.cacheKeys),
			});
		},
	});
}
