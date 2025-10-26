import { KernelError } from '@wpkernel/core/contracts';
import type { IRResource } from '../../../../../ir/types';
import { toSnakeCase } from '../../utils';

export type TransientStorage = Extract<
	NonNullable<IRResource['storage']>,
	{ mode: 'transient' }
>;

export interface ResolveTransientKeyOptions {
	readonly resource: IRResource;
	readonly namespace?: string | null;
}

export function ensureTransientStorage(resource: IRResource): TransientStorage {
	const storage = resource.storage;
	if (!storage || storage.mode !== 'transient') {
		throw new KernelError('DeveloperError', {
			message: 'Resource must use transient storage.',
			context: { name: resource.name },
		});
	}

	return storage;
}

export function resolveTransientKey(
	options: ResolveTransientKeyOptions
): string {
	ensureTransientStorage(options.resource);

	const namespace = options.namespace ?? '';
	const namespaceSlug = toSnakeCase(namespace.replace(/\\/g, '_'));
	const resourceSlug = toSnakeCase(options.resource.name) || 'resource';
	const keyParts = [namespaceSlug, resourceSlug].filter(Boolean);

	if (keyParts.length === 0) {
		return resourceSlug;
	}

	return keyParts.join('_');
}
