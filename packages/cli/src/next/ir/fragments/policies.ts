import { createHelper } from '../../runtime';
import { collectPolicyHints } from '../shared/policies';
import type { IrFragment, IrFragmentApplyOptions } from '../types';

export function createPoliciesFragment(): IrFragment {
	return createHelper({
		key: 'ir.policies.core',
		kind: 'fragment',
		dependsOn: ['ir.resources.core'],
		async apply({ input, output }: IrFragmentApplyOptions) {
			const policies = collectPolicyHints(input.draft.resources);
			output.assign({ policies });
		},
	});
}
