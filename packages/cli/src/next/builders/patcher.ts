import { createHelper } from '../helper';
import type { BuilderHelper } from '../runtime/types';

export function createPatcher(): BuilderHelper {
	return createHelper({
		key: 'builder.apply.patch.core',
		kind: 'builder',
		async apply({ reporter }) {
			reporter.debug('createPatcher: awaiting implementation.');
		},
	});
}
