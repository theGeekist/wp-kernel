import { createHelper } from '../../helper';
import { resolveNamespaceAndName } from '../../../resource/namespace';
import type {
	ResourceFragmentHelper,
	ResourceFragmentInput,
	ResourceFragmentKind,
	ResourcePipelineContext,
	ResourcePipelineDraft,
} from '../types';
import { RESOURCE_FRAGMENT_KIND } from '../types';
import type { Reporter } from '../../../reporter/types';
import type { NormalizedResourceConfig } from '../../../resource/buildResourceObject';

export function buildResourceNamespaceFragment<
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
		key: 'resource.namespace.resolve',
		kind: RESOURCE_FRAGMENT_KIND,
		apply: ({ context, output }) => {
			const overridesNamespace = context.namespace.trim().length > 0;
			const overridesResourceName =
				context.resourceName.trim().length > 0;
			const resolved = resolveNamespaceAndName(context.config);
			const namespace = overridesNamespace
				? context.namespace
				: resolved.namespace;
			const resourceName = overridesResourceName
				? context.resourceName
				: resolved.resourceName;
			const fallbackNormalizedConfig: NormalizedResourceConfig<
				T,
				TQuery
			> = {
				...context.config,
				name: resourceName,
			};
			const normalizedConfig =
				context.normalizedConfig ?? fallbackNormalizedConfig;
			const storeKey =
				context.storeKey && context.storeKey.trim().length > 0
					? context.storeKey
					: `${namespace}/${resourceName}`;

			context.namespace = namespace;
			context.resourceName = resourceName;
			context.normalizedConfig = normalizedConfig;
			context.storeKey = storeKey;

			output.namespace = namespace;
			output.resourceName = resourceName;
			output.storeKey = storeKey;
		},
	}) satisfies ResourceFragmentHelper<T, TQuery>;
}
