import path from 'node:path';
import { createHelper } from '../../runtime';
import { discoverBlocks } from '../shared/block-discovery';
import type { IrFragment, IrFragmentApplyOptions } from '../types';

/**
 * Creates an IR fragment that discovers and processes WordPress blocks.
 *
 * This fragment depends on the meta fragment to determine the workspace root
 * and then uses `block-discovery` to find and include block definitions in the IR.
 *
 * @category IR Fragments
 * @returns An `IrFragment` instance for block discovery.
 */
export function createBlocksFragment(): IrFragment {
	return createHelper({
		key: 'ir.blocks.core',
		kind: 'fragment',
		dependsOn: ['ir.meta.core'],
		async apply({ input, output }: IrFragmentApplyOptions) {
			const workspaceRoot = path.dirname(input.options.sourcePath);
			const blocks = await discoverBlocks(workspaceRoot);
			output.assign({ blocks });
		},
	});
}
