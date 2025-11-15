import type { IRResource, IRResourceCacheKey } from '../publicTypes';

/**
 * Build IR cache key descriptors for a resource.
 *
 * Cache keys are currently derived exclusively from the resource name to
 * preserve determinism in `.generated/**`. User-defined cache key functions
 * were removed from `wpk.config.ts` to keep the config serialisable.
 *
 * @param    resourceName - Resource name used in default segments
 * @returns IR-style cache key descriptors
 * @category IR
 */
export function deriveCacheKeys(resourceName: string): IRResource['cacheKeys'] {
	const defaults = createDefaultCacheKeySegments(resourceName);

	const build = (key: keyof typeof defaults): IRResourceCacheKey => ({
		source: 'default' as const,
		segments: defaults[key],
	});

	return {
		list: build('list'),
		get: build('get'),
		create: undefined,
		update: undefined,
		remove: undefined,
	};
}

/**
 * Create the default cache key segments used when a resource does not
 * provide custom cache key functions.
 *
 * Defaults encode the operation and a stable placeholder token used for
 * get/update/remove operations.
 *
 * @param    resourceName - Name of the resource
 * @returns Default segments for list/get/create/update/remove keys
 * @category IR
 */
export function createDefaultCacheKeySegments(resourceName: string): {
	list: readonly unknown[];
	get: readonly unknown[];
	create: readonly unknown[];
	update: readonly unknown[];
	remove: readonly unknown[];
} {
	const idToken = '__wpk_id__';
	const emptyObjectToken = '{}';

	return {
		list: Object.freeze([resourceName, 'list', emptyObjectToken] as const),
		get: Object.freeze([resourceName, 'get', idToken] as const),
		create: Object.freeze([
			resourceName,
			'create',
			emptyObjectToken,
		] as const),
		update: Object.freeze([resourceName, 'update', idToken] as const),
		remove: Object.freeze([resourceName, 'remove', idToken] as const),
	};
}

/**
 * Convert IRResource cache key descriptors into a plain serialisable
 * object suitable for inclusion in generated output.
 *
 * Optional operations (create/update/remove) are only included when
 * present on the descriptor.
 *
 * @param    cacheKeys - IR resource cache key information
 * @returns Plain object with cache key arrays
 * @category IR
 */
export function serializeCacheKeys(
	cacheKeys: IRResource['cacheKeys']
): Record<string, unknown> {
	const entries: Record<string, unknown> = {
		list: cacheKeys.list,
		get: cacheKeys.get,
	};

	if (cacheKeys.create) {
		entries.create = cacheKeys.create;
	}

	if (cacheKeys.update) {
		entries.update = cacheKeys.update;
	}

	if (cacheKeys.remove) {
		entries.remove = cacheKeys.remove;
	}

	return entries;
}
