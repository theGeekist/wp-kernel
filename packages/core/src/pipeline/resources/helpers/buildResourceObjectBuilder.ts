import { createHelper } from '../../helper';
import { buildResourceObject } from '../../../resource/buildResourceObject';
import type { ResourceBuilderHelper } from '../types';
import { WPKernelError } from '../../../error/WPKernelError';

export function buildResourceObjectBuilder<T, TQuery>(): ResourceBuilderHelper<
	T,
	TQuery
> {
	return createHelper({
		key: 'resource.object.build',
		kind: 'core.resource.builder',
		apply: ({ context, output }) => {
			if (!output.client) {
				throw new WPKernelError('DeveloperError', {
					message:
						'Resource pipeline executed without a client instance. Ensure resource.client.build runs first.',
				});
			}

			if (!output.cacheKeys) {
				throw new WPKernelError('DeveloperError', {
					message:
						'Resource pipeline executed without cache keys. Ensure resource.cacheKeys.build runs first.',
				});
			}

			output.resource = buildResourceObject({
				config: context.config,
				normalizedConfig: context.normalizedConfig,
				namespace: context.namespace,
				resourceName: context.resourceName,
				reporter: context.reporter,
				cacheKeys: output.cacheKeys,
				client: output.client,
			});
		},
	});
}
