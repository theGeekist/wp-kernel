import type { CacheKeyFn, CacheKeys } from '@wpkernel/core/resource';
import { WPKernelError } from '@wpkernel/core/contracts';
import type { IRResource, IRResourceCacheKey } from '../publicTypes';

export function deriveCacheKeys(
	cacheKeys: CacheKeys<unknown> | undefined,
	resourceName: string
): IRResource['cacheKeys'] {
	const defaults = createDefaultCacheKeySegments(resourceName);

	const evaluate = <T>(
		key: keyof typeof defaults,
		fn: CacheKeyFn<T> | undefined,
		placeholder: T | undefined
	): IRResourceCacheKey => {
		if (!fn) {
			return {
				source: 'default',
				segments: defaults[key],
			};
		}

		try {
			const result =
				typeof placeholder === 'undefined' ? fn() : fn(placeholder);
			if (!Array.isArray(result)) {
				throw new WPKernelError('ValidationError', {
					message: `cacheKeys.${String(
						key
					)} for resource "${resourceName}" must return an array.`,
					context: {
						resourceName,
						cacheKey: String(key),
					},
				});
			}

			return {
				source: 'config',
				segments: Object.freeze(result.map((value) => value)),
			};
		} catch (error) {
			if (WPKernelError.isWPKernelError(error)) {
				throw error;
			}

			const message = `Failed to evaluate cacheKeys.${String(key)} for resource "${resourceName}".`;
			throw new WPKernelError('ValidationError', {
				message,
				context: {
					resourceName,
					cacheKey: String(key),
				},
				data:
					error instanceof Error
						? { originalError: error }
						: undefined,
			});
		}
	};

	return {
		list: evaluate('list', cacheKeys?.list, undefined),
		get: evaluate('get', cacheKeys?.get, '__wpk_id__' as string | number),
		create: cacheKeys?.create
			? evaluate('create', cacheKeys.create, undefined)
			: undefined,
		update: cacheKeys?.update
			? evaluate(
					'update',
					cacheKeys.update,
					'__wpk_id__' as string | number
				)
			: undefined,
		remove: cacheKeys?.remove
			? evaluate(
					'remove',
					cacheKeys.remove,
					'__wpk_id__' as string | number
				)
			: undefined,
	};
}

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
