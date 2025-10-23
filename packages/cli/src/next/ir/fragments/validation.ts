import { KernelError } from '@wpkernel/core/error';
import { createHelper } from '@wpkernel/core/pipeline';
import type { IrFragment, IrFragmentApplyOptions } from '../types';

export function createValidationFragment(): IrFragment {
	return createHelper({
		key: 'ir.validation.core',
		kind: 'fragment',
		dependsOn: ['ir.meta.core', 'ir.resources.core', 'ir.policy-map.core'],
		async apply({ input }: IrFragmentApplyOptions) {
			if (!input.draft.meta) {
				throw new KernelError('ValidationError', {
					message: 'IR meta was not initialised before validation.',
				});
			}

			if (!input.draft.policyMap) {
				throw new KernelError('ValidationError', {
					message:
						'IR policy map was not resolved before validation.',
				});
			}

			for (const resource of input.draft.resources) {
				if (!resource.schemaKey) {
					throw new KernelError('ValidationError', {
						message: `Resource "${resource.name}" is missing a schema association after resource fragment execution.`,
						context: { resource: resource.name },
					});
				}
			}
		},
	});
}
