import path from 'node:path';
import { createHelper } from '../../helper';
import { discoverBlocks } from '../../../ir/block-discovery';
import type { IrFragment } from '../types';

export function createBlocksFragment(): IrFragment {
	return createHelper({
		key: 'ir.blocks.core',
		kind: 'fragment',
		dependsOn: ['ir.meta.core'],
		async apply({ input, output }) {
			const workspaceRoot = path.dirname(input.options.sourcePath);
			const blocks = await discoverBlocks(workspaceRoot);
			output.assign({ blocks });
		},
	});
}
