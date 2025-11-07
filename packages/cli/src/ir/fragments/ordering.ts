import { createHelper } from '../../runtime';
import {
	sortBlocks,
	sortCapabilities,
	sortResources,
	sortSchemas,
} from '../shared/ordering';
import type { IrFragment, IrFragmentApplyOptions } from '../types';

/**
 * Creates an IR fragment that sorts various IR collections for consistent output.
 *
 * This fragment depends on schemas, resources, capabilities, and blocks fragments
 * to ensure that these collections are consistently ordered in the IR,
 * which is important for reproducible code generation.
 *
 * @category IR
 * @returns An `IrFragment` instance for ordering IR collections.
 */
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
