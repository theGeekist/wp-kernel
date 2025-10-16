import { createHelper } from '../../helper';
import {
	sortBlocks,
	sortPolicies,
	sortResources,
	sortSchemas,
} from '../../../ir/ordering';
import type { IrFragment } from '../types';

export function createOrderingFragment(): IrFragment {
	return createHelper({
		key: 'ir.ordering.core',
		kind: 'fragment',
		dependsOn: [
			'ir.schemas.core',
			'ir.resources.core',
			'ir.policies.core',
			'ir.blocks.core',
		],
		async apply({ input, output }) {
			output.assign({
				schemas: sortSchemas(input.draft.schemas),
				resources: sortResources(input.draft.resources),
				policies: sortPolicies(input.draft.policies),
				blocks: sortBlocks(input.draft.blocks),
			});
		},
	});
}
