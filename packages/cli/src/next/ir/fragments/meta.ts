import { sanitizeNamespace } from '@wpkernel/core/namespace';
import { KernelError } from '@wpkernel/core/error';
import { createHelper } from '../../helper';
import type { IrFragment } from '../types';
import { toWorkspaceRelative } from '../../../utils';
import { createPhpNamespace } from '../../../ir/php';

export const META_EXTENSION_KEY = 'ir.meta.core';

export function createMetaFragment(): IrFragment {
	return createHelper({
		key: 'ir.meta.core',
		kind: 'fragment',
		mode: 'override',
		async apply({ input, output }) {
			const sanitizedNamespace = sanitizeNamespace(
				input.options.namespace
			);
			if (!sanitizedNamespace) {
				throw new KernelError('ValidationError', {
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
