import { sanitizeNamespace } from '@wpkernel/core/namespace';
import { WPKernelError } from '@wpkernel/core/error';
import { createHelper } from '../../runtime';
import type { IrFragment, IrFragmentApplyOptions } from '../types';
import { toWorkspaceRelative } from '../../utils';
import { createPhpNamespace } from '../shared/php';

/**
 * The extension key for the meta fragment.
 *
 * @category IR Fragments
 */
export const META_EXTENSION_KEY = 'ir.meta.core';

/**
 * Creates an IR fragment that processes and assigns metadata to the IR.
 *
 * This fragment sanitizes the project namespace, determines source paths and origins,
 * and sets up the basic PHP configuration for the generated output.
 *
 * @category IR Fragments
 * @returns An `IrFragment` instance for meta information.
 */
export function createMetaFragment(): IrFragment {
	return createHelper({
		key: 'ir.meta.core',
		kind: 'fragment',
		mode: 'override',
		async apply({ input, output }: IrFragmentApplyOptions) {
			const sanitizedNamespace = sanitizeNamespace(
				input.options.namespace
			);
			if (!sanitizedNamespace) {
				throw new WPKernelError('ValidationError', {
					message: `Unable to sanitise namespace "${input.options.namespace}" during IR construction.`,
					context: {
						namespace: input.options.namespace,
					},
				});
			}

			const meta = {
				version: 1 as const,
				namespace: input.options.namespace,
				sourcePath: toWorkspaceRelative(input.options.sourcePath),
				origin: input.options.origin,
				sanitizedNamespace,
			};

			output.assign({
				meta,
				php: {
					namespace: createPhpNamespace(sanitizedNamespace),
					autoload: 'inc/',
					outputDir: '.generated/php',
				},
			});

			input.draft.extensions[META_EXTENSION_KEY] = { sanitizedNamespace };
		},
	});
}
