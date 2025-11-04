import { WPKernelError } from '@wpkernel/core/error';
import { createHelper } from '../../runtime';
import { buildResources } from '../shared/resource-builder';
import type { SchemaAccumulator } from '../shared/schema';
import type { IrFragment, IrFragmentApplyOptions } from '../types';
import { META_EXTENSION_KEY } from './meta';
import { SCHEMA_EXTENSION_KEY } from './schemas';

/**
 * Creates an IR fragment that processes and builds resource definitions.
 *
 * This fragment depends on the meta and schemas fragments to properly construct
 * the resource definitions, including their associated schemas and namespace information.
 *
 * @category IR Fragments
 * @returns An `IrFragment` instance for resource processing.
 */
export function createResourcesFragment(): IrFragment {
	return createHelper({
		key: 'ir.resources.core',
		kind: 'fragment',
		dependsOn: [META_EXTENSION_KEY, SCHEMA_EXTENSION_KEY],
		async apply({ input, output }: IrFragmentApplyOptions) {
			const meta = input.draft.extensions[META_EXTENSION_KEY] as
				| { sanitizedNamespace: string }
				| undefined;
			if (!meta) {
				throw new WPKernelError('ValidationError', {
					message:
						'Meta fragment must run before resources fragment.',
				});
			}

			const accumulator = input.draft.extensions[SCHEMA_EXTENSION_KEY] as
				| SchemaAccumulator
				| undefined;
			if (!accumulator) {
				throw new WPKernelError('ValidationError', {
					message:
						'Schemas fragment must run before resources fragment.',
				});
			}

			const resources = await buildResources(
				input.options,
				accumulator,
				meta.sanitizedNamespace
			);

			output.assign({ resources });
		},
	});
}
