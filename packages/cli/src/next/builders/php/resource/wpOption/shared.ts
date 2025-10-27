import { KernelError } from '@wpkernel/core/contracts';
import type { IRResource } from '../../../../ir/publicTypes';

export type WpOptionStorage = Extract<
	NonNullable<IRResource['storage']>,
	{ mode: 'wp-option' }
>;

export function ensureWpOptionStorage(resource: IRResource): WpOptionStorage {
	const storage = resource.storage;
	if (!storage || storage.mode !== 'wp-option') {
		throw new KernelError('DeveloperError', {
			message: 'Resource must use wp-option storage.',
			context: { name: resource.name },
		});
	}

	return storage;
}
