import path from 'node:path';
import { createHelper } from '../../helper';
import { resolvePolicyMap } from '../../../ir/policy-map';
import type { IrFragment } from '../types';

export function createPolicyMapFragment(): IrFragment {
	return createHelper({
		key: 'ir.policy-map.core',
		kind: 'fragment',
		dependsOn: ['ir.resources.core', 'ir.policies.core'],
		async apply({ input, output }) {
			const policyMap = await resolvePolicyMap({
				workspaceRoot: path.dirname(input.options.sourcePath),
				hints: input.draft.policies,
				resources: input.draft.resources,
			});

			output.assign({ policyMap });
		},
	});
}
