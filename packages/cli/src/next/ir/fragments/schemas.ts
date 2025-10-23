import { createHelper } from '@wpkernel/core/pipeline';
import {
	createSchemaAccumulator,
	loadConfiguredSchemas,
} from '../../../ir/schema';
import type { IrFragment, IrFragmentApplyOptions } from '../types';

export const SCHEMA_EXTENSION_KEY = 'ir.schemas.core';

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
