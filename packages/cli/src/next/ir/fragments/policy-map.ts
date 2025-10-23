import path from 'node:path';
import { createHelper } from '@wpkernel/core/pipeline';
import { resolvePolicyMap } from '../../../ir/policy-map';
import type { IrFragment, IrFragmentApplyOptions } from '../types';

export function createPolicyMapFragment(): IrFragment {
	return createHelper({
		key: 'ir.policy-map.core',
		kind: 'fragment',
		dependsOn: ['ir.resources.core', 'ir.policies.core'],
		async apply({ input, output }: IrFragmentApplyOptions) {
			const policyMap = await resolvePolicyMap({
				workspaceRoot: path.dirname(input.options.sourcePath),
				hints: input.draft.policies,
				resources: input.draft.resources,
			});

			output.assign({ policyMap });
		},
	});
}
