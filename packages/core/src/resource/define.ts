/**
 * Resource definition and client generation
 *
 * Core function for declaring typed REST resources with automatic
 * client methods, store keys, and cache management.
 *
 * @see Product Specification § 4.1 Resources
 */
import { WPKernelError } from '../error/WPKernelError';
import type { ResourceConfig, ResourceObject } from './types';
import { createResourcePipeline } from '../pipeline/resources/createResourcePipeline';
import type { ResourcePipelineRunResult } from '../pipeline/resources/types';
import type { MaybePromise } from '../pipeline/types';

function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
	return (
		!!value &&
		(typeof value === 'object' || typeof value === 'function') &&
		typeof (value as PromiseLike<T>).then === 'function'
	);
}

function resolveResourceArtifact<T, TQuery>(
	result: ResourcePipelineRunResult<T, TQuery>
): ResourceObject<T, TQuery> {
	if (!result.artifact.resource) {
		throw new WPKernelError('DeveloperError', {
			message:
				'Resource pipeline completed without producing a resource artifact.',
		});
	}

	if (!result.artifact.namespace) {
		throw new WPKernelError('DeveloperError', {
			message:
				'Resource pipeline completed without resolving a namespace. Ensure resource.namespace.resolve runs first.',
		});
	}

	return result.artifact.resource as ResourceObject<T, TQuery>;
}

function normalizeRunResult<T, TQuery>(
	result: MaybePromise<ResourcePipelineRunResult<T, TQuery>>
): MaybePromise<ResourceObject<T, TQuery>> {
	if (isPromiseLike(result)) {
		return Promise.resolve(result).then(resolveResourceArtifact<T, TQuery>);
	}

	return resolveResourceArtifact<T, TQuery>(result);
}

/**
 * Define a resource with typed REST client
 *
 * Creates a resource object with:
 * - Typed client methods (fetchList, fetch, create, update, remove)
 * - Store key for @wordpress/data registration
 * - Cache key generators for invalidation
 * - Route definitions
 * - Thin-flat API (useGet, useList, prefetchGet, prefetchList, invalidate, key)
 * - Grouped API (select.*, use.*, get.*, mutate.*, cache.*, storeApi.*, events.*)
 *
 * @template T - Resource entity type (e.g., TestimonialPost)
 * @template TQuery - Query parameters type for list operations (e.g., { search?: string })
 * @param    config - Resource configuration
 * @return Resource object with client methods and metadata
 * @throws DeveloperError if configuration is invalid
 */
export function defineResource<T = unknown, TQuery = unknown>(
	config: ResourceConfig<T, TQuery>
): MaybePromise<ResourceObject<T, TQuery>> {
	if (!config || typeof config !== 'object') {
		throw new WPKernelError('DeveloperError', {
			message:
				'defineResource requires a configuration object with "name" and "routes".',
		});
	}

	if (!config.name || typeof config.name !== 'string') {
		throw new WPKernelError('DeveloperError', {
			message:
				'defineResource requires a non-empty string "name" property.',
		});
	}

	const pipeline = createResourcePipeline<T, TQuery>();
	const runResult = pipeline.run({
		config,
	});

	return normalizeRunResult<T, TQuery>(runResult);
}
