import { WPKernelError } from '@wpkernel/core/error';
import { createHelper } from '../../runtime';
import type { IrFragment, IrFragmentApplyOptions } from '../types';

/**
 * Creates an IR fragment that performs final validation checks on the IR.
 *
 * This fragment depends on the meta, resources, and capability-map fragments
 * to ensure that the IR is internally consistent and meets all framework contracts.
 * It throws `WPKernelError` if any critical validation fails.
 *
 * @category IR Fragments
 * @returns An `IrFragment` instance for final IR validation.
 */
export function createValidationFragment(): IrFragment {
	return createHelper({
		key: 'ir.validation.core',
		kind: 'fragment',
		dependsOn: [
			'ir.meta.core',
			'ir.resources.core',
			'ir.capability-map.core',
		],
		async apply({ input }: IrFragmentApplyOptions) {
			if (!input.draft.meta) {
				throw new WPKernelError('ValidationError', {
					message: 'IR meta was not initialised before validation.',
				});
			}

			if (!input.draft.capabilityMap) {
				throw new WPKernelError('ValidationError', {
					message:
						'IR capability map was not resolved before validation.',
				});
			}

			for (const resource of input.draft.resources) {
				if (!resource.schemaKey) {
					throw new WPKernelError('ValidationError', {
						message: `Resource "${resource.name}" is missing a schema association after resource fragment execution.`,
						context: { resource: resource.name },
					});
				}
			}
		},
	});
}
