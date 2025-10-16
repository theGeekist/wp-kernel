import { createHelper } from '../helper';
import type { BuilderHelper } from '../runtime/types';

export function createBundler(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.bundler.core',
		kind: 'builder',
		async apply({ reporter }) {
			reporter.debug('createBundler: no-op builder executed.');
		},
	});
}
