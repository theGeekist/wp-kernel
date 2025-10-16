import { createHelper } from '../helper';
import type { BuilderHelper } from '../runtime/types';

export function createTsBuilder(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.ts.core',
		kind: 'builder',
		async apply({ reporter }) {
			reporter.debug('createTsBuilder: awaiting implementation.');
		},
	});
}
