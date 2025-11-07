import { createHelper } from '../../runtime';
import { resolveCapabilityMap } from '../shared/capability-map';
import type { IrFragment, IrFragmentApplyOptions } from '../types';

/**
 * Creates an IR fragment that resolves and assigns the capability map to the IR.
 *
 * This fragment depends on the resources and capabilities fragments to build a
 * comprehensive map of all capabilities used within the project.
 *
 * @category IR
 * @returns An `IrFragment` instance for capability map resolution.
 */
export function createCapabilityMapFragment(): IrFragment {
	return createHelper({
		key: 'ir.capability-map.core',
		kind: 'fragment',
		dependsOn: ['ir.resources.core', 'ir.capabilities.core'],
		async apply({ input, output }: IrFragmentApplyOptions) {
			const capabilityMap = await resolveCapabilityMap({
				hints: input.draft.capabilities,
				resources: input.draft.resources,
			});

			output.assign({ capabilityMap });
		},
	});
}
