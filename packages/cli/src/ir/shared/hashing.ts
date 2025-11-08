import { hashCanonical } from './canonical';
import type { IRHashProvenance } from '../publicTypes';

export const HASH_ALGORITHM = 'sha256';

/**
 * Construct a standard hash provenance object for IR entities.
 *
 * @param inputs - Logical inputs that contributed to the hash calculation
 * @param value  - Value to hash via canonical serialisation
 */
export function buildHashProvenance(
	inputs: readonly string[],
	value: unknown
): IRHashProvenance {
	return {
		algo: HASH_ALGORITHM,
		inputs,
		value: hashCanonical(value),
	};
}
