import path from 'node:path';
import { createHelper } from '../../runtime';
import { resolveCapabilityMap } from '../shared/capability-map';
import type { IrFragment, IrFragmentApplyOptions } from '../types';

export function createCapabilityMapFragment(): IrFragment {
	return createHelper({
		key: 'ir.capability-map.core',
		kind: 'fragment',
		dependsOn: ['ir.resources.core', 'ir.capabilities.core'],
		async apply({ input, output }: IrFragmentApplyOptions) {
			const capabilityMap = await resolveCapabilityMap({
				workspaceRoot: path.dirname(input.options.sourcePath),
				hints: input.draft.capabilities,
				resources: input.draft.resources,
			});

			output.assign({ capabilityMap });
		},
	});
}
