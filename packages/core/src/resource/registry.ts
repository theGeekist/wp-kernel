import { WPKernelError } from '../error/WPKernelError';
import type { ResourceConfig, ResourceRoutes } from './types';

/**
 * Resource configuration shape accepted by {@link assignResourceNames}.
 *
 * Allows authoring resources without duplicating the key in the `name` field.
 * If `name` is omitted, it will be derived from the registry key.
 */
export type ResourceConfigInput<
	T = unknown,
	TQuery = unknown,
	TRoutes extends ResourceRoutes = ResourceRoutes,
> = Omit<ResourceConfig<T, TQuery, TRoutes>, 'name'> & {
	name?: ResourceConfig<T, TQuery, TRoutes>['name'];
};

/**
 * Registry shape accepted by {@link assignResourceNames}.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export type ResourceRegistryInput<
	TEntries extends Record<
		string,
		ResourceConfigInput<any, any, ResourceRoutes>
	> = Record<string, ResourceConfigInput<any, any, ResourceRoutes>>,
> = TEntries;
/* eslint-enable @typescript-eslint/no-explicit-any */

function isObject(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object';
}

/**
 * Normalises a resource registry by ensuring every entry has a `name` field.
 *
 * Configuration authors can omit `name` and rely on the registry key instead.
 * The helper rehydrates `name` so downstream consumers (CLI, runtime) receive
 * canonical `ResourceConfig` objects.
 *
 * @example
 * ```ts
 * import { assignResourceNames } from '@wpkernel/core/resource';
 *
 * const resources = assignResourceNames({
 *   job: {
 *     routes: { list: { path: '/jobs', method: 'GET' } },
 *     storage: { mode: 'transient' },
 *   },
 * });
 *
 * resources.job.name; // => 'job'
 * ```
 *
 * @category Resource
 * @param    registry - Resource registry keyed by slug without mandatory `name`
 * @returns Registry with canonical `name` fields populated
 * @throws `WPKernelError` when an entry is not an object
 */
export function assignResourceNames<TInput extends Record<string, unknown>>(
	registry: TInput
): { [K in keyof TInput]: ResourceConfig & TInput[K] } {
	const entries = Object.entries(registry).map(([resourceKey, config]) => {
		if (!isObject(config)) {
			throw new WPKernelError('DeveloperError', {
				message: `Resource "${resourceKey}" must be configured with an object.`,
			});
		}

		const candidateName = (config as { name?: unknown }).name;
		const resolvedName =
			typeof candidateName === 'string' && candidateName.trim().length > 0
				? candidateName
				: resourceKey;

		return [
			resourceKey,
			{
				...config,
				name: resolvedName,
			},
		] as const;
	});

	return Object.fromEntries(entries) as {
		[K in keyof TInput]: ResourceConfig & TInput[K];
	};
}
