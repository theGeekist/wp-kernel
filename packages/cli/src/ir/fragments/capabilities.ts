import { createHelper } from '../../runtime';
import { collectCapabilityHints } from '../shared/capabilities';
import type { IrFragment, IrFragmentApplyOptions } from '../types';

/**
 * Creates an IR fragment that collects capability hints from resource definitions.
 *
 * This fragment depends on the resources fragment to gather all defined capabilities
 * across the project, which are then used for generating capability maps.
 *
 * @category IR
 * @returns An `IrFragment` instance for capability collection.
 */
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
