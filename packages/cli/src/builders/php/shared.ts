import { WPKernelError } from '@wpkernel/core/error';
import type { IRResource } from '../../ir/publicTypes';

/**
 * WordPress Options storage configuration type.
 *
 * Represents a resource storage configuration that uses WordPress's `wp_options`
 * table for persistence. Extracted from the IR resource storage union type.
 *
 * @category Builders
 */
export type WpOptionStorage = Extract<
	NonNullable<IRResource['storage']>,
	{ mode: 'wp-option' }
>;

/**
 * Validates and extracts WordPress Options storage config from a resource.
 *
 * Type-guards and ensures the resource uses `wp-option` storage mode.
 * Throws a developer error if the resource storage is misconfigured or missing.
 *
 * @param  resource - IR resource to validate
 * @returns Validated wp-option storage configuration
 * @throws {WPKernelError} DeveloperError if storage is not wp-option mode
 * @category Builders
 */
export function ensureWpOptionStorage(resource: IRResource): WpOptionStorage {
	const storage = resource.storage;
	if (!storage || storage.mode !== 'wp-option') {
		throw new WPKernelError('DeveloperError', {
			message: 'Resource must use wp-option storage.',
			context: { name: resource.name },
		});
	}

	return storage;
}
