import { createHelper } from '../../helper';
import { collectPolicyHints } from '../../../ir/policies';
import type { IrFragment } from '../types';

export function createPoliciesFragment(): IrFragment {
	return createHelper({
		key: 'ir.policies.core',
		kind: 'fragment',
		dependsOn: ['ir.resources.core'],
		async apply({ input, output }) {
			const policies = collectPolicyHints(input.draft.resources);
			output.assign({ policies });
		},
	});
}
