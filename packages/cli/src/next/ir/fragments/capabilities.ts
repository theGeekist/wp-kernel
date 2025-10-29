import { createHelper } from '../../runtime';
import { collectCapabilityHints } from '../shared/capabilities';
import type { IrFragment, IrFragmentApplyOptions } from '../types';

export function createCapabilitiesFragment(): IrFragment {
	return createHelper({
		key: 'ir.capabilities.core',
		kind: 'fragment',
		dependsOn: ['ir.resources.core'],
		async apply({ input, output }: IrFragmentApplyOptions) {
			const capabilities = collectCapabilityHints(input.draft.resources);
			output.assign({ capabilities });
		},
	});
}
