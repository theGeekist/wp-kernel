import { createHelper } from '../../helper';
import { resolveResourceReporter } from '../../../resource/reporter';
import type {
	ResourceFragmentHelper,
	ResourceFragmentInput,
	ResourceFragmentKind,
	ResourcePipelineContext,
	ResourcePipelineDraft,
} from '../types';
import { RESOURCE_FRAGMENT_KIND } from '../types';
import type { Reporter } from '../../../reporter/types';
import { WPKernelError } from '../../../error/WPKernelError';

export function buildResourceReporterFragment<
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
		key: 'resource.reporter.resolve',
		kind: RESOURCE_FRAGMENT_KIND,
		dependsOn: ['resource.namespace.resolve'],
		apply: ({ context, output }) => {
			if (!context.namespace || !context.resourceName) {
				throw new WPKernelError('DeveloperError', {
					message:
						'Resource reporter resolution requires namespace and resource name metadata. Ensure resource.namespace.resolve runs first.',
				});
			}

			const reporter = resolveResourceReporter({
				namespace: context.namespace,
				resourceName: context.resourceName,
				override: context.config.reporter,
			});

			context.reporter = reporter;
			output.reporter = reporter;
		},
	}) satisfies ResourceFragmentHelper<T, TQuery>;
}
