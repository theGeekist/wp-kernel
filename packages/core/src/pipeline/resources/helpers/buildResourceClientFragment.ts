import { createHelper } from '../../helper';
import { createClient } from '../../../resource/client';
import type { ResourceFragmentHelper } from '../types';

export function buildResourceClientFragment<
	T,
	TQuery,
>(): ResourceFragmentHelper<T, TQuery> {
	return createHelper({
		key: 'resource.client.build',
		kind: 'core.resource.fragment',
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
	});
}
