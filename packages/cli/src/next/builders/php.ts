import { createHelper } from '../helper';
import type { BuilderHelper } from '../runtime/types';

export function createPhpBuilder(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.core',
		kind: 'builder',
		async apply({ reporter }) {
			reporter.debug('createPhpBuilder: awaiting implementation.');
		},
	});
}
