import { createHelper } from '../../runtime';
import {
	createSchemaAccumulator,
	loadConfiguredSchemas,
} from '../shared/schema';
import type { IrFragment, IrFragmentApplyOptions } from '../types';

/**
 * The extension key for the schemas fragment.
 *
 * @category IR
 */
export const SCHEMA_EXTENSION_KEY = 'ir.schemas.core';

/**
 * Creates an IR fragment that processes and accumulates schema definitions.
 *
 * This fragment loads schemas configured in the `wpk.config.*` file and makes
 * them available in the Intermediate Representation.
 *
 * @category IR
 * @returns An `IrFragment` instance for schema processing.
 */
export function createSchemasFragment(): IrFragment {
	return createHelper({
		key: 'ir.schemas.core',
		kind: 'fragment',
		async apply({ input, output }: IrFragmentApplyOptions) {
			const accumulator = createSchemaAccumulator();
			await loadConfiguredSchemas(input.options, accumulator);

			input.draft.extensions[SCHEMA_EXTENSION_KEY] = accumulator;
			output.assign({ schemas: accumulator.entries });
		},
	});
}
