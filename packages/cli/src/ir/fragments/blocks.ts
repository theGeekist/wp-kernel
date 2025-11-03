import path from 'node:path';
import { createHelper } from '../../runtime';
import { discoverBlocks } from '../shared/block-discovery';
import type { IrFragment, IrFragmentApplyOptions } from '../types';

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
