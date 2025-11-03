import { createHelper } from '../../runtime';
import {
	sortBlocks,
	sortCapabilities,
	sortResources,
	sortSchemas,
} from '../shared/ordering';
import type { IrFragment, IrFragmentApplyOptions } from '../types';

export function createOrderingFragment(): IrFragment {
	return createHelper({
		key: 'ir.ordering.core',
		kind: 'fragment',
		dependsOn: [
			'ir.schemas.core',
			'ir.resources.core',
			'ir.capabilities.core',
			'ir.blocks.core',
		],
		async apply({ input, output }: IrFragmentApplyOptions) {
			output.assign({
				schemas: sortSchemas(input.draft.schemas),
				resources: sortResources(input.draft.resources),
				capabilities: sortCapabilities(input.draft.capabilities),
				blocks: sortBlocks(input.draft.blocks),
			});
		},
	});
}
