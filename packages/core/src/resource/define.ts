/**
 * Resource definition and client generation
 *
 * Core function for declaring typed REST resources with automatic
 * client methods, store keys, and cache management.
 *
 * @see Product Specification § 4.1 Resources
 */
import { WPKernelError } from '../error/WPKernelError';
import { validateConfig } from './validation';
import { createClient } from './client';
import { createDefaultCacheKeys } from './utils';
import type { CacheKeys, ResourceConfig, ResourceObject } from './types';
import { getWPKernelEventBus, recordResourceDefined } from '../events/bus';
import type { Reporter } from '../reporter';
import { isCorePipelineEnabled } from '../configuration/flags';
import { createResourcePipeline } from '../pipeline/resources/createResourcePipeline';
import type { ResourcePipelineRunResult } from '../pipeline/resources/types';
import type { MaybePromise } from '../pipeline/types';
import { resolveNamespaceAndName } from './namespace';
import { resolveResourceReporter } from './reporter';
import { RESOURCE_LOG_MESSAGES } from './logMessages';
import {
	buildResourceObject,
	type NormalizedResourceConfig,
} from './buildResourceObject';

interface BuildLegacyResourceOptions<T, TQuery> {
	readonly config: ResourceConfig<T, TQuery>;
	readonly normalizedConfig: NormalizedResourceConfig<T, TQuery>;
	readonly namespace: string;
	readonly resourceName: string;
	readonly reporter: Reporter;
}

function buildLegacyResource<T, TQuery>(
	options: BuildLegacyResourceOptions<T, TQuery>
): ResourceObject<T, TQuery> {
	const { config, normalizedConfig, namespace, resourceName, reporter } =
		options;

	validateConfig(normalizedConfig);

	reporter.info(RESOURCE_LOG_MESSAGES.define, {
		namespace,
		resource: resourceName,
		routes: Object.keys(config.routes ?? {}),
		hasCacheKeys: Boolean(config.cacheKeys),
	});

	const client = createClient<T, TQuery>(config, reporter, {
		namespace,
		resourceName,
	});

	const cacheKeys: Required<CacheKeys<TQuery>> = {
		...createDefaultCacheKeys<TQuery>(resourceName),
		...config.cacheKeys,
	};

	return buildResourceObject({
		config,
		normalizedConfig,
		namespace,
		resourceName,
		reporter,
		cacheKeys,
		client,
	});
}

function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
	return (
		!!value &&
		(typeof value === 'object' || typeof value === 'function') &&
		typeof (value as PromiseLike<T>).then === 'function'
	);
}

function assertSynchronousRunResult<T, TQuery>(
	result: MaybePromise<ResourcePipelineRunResult<T, TQuery>>
): ResourcePipelineRunResult<T, TQuery> {
	if (isPromiseLike(result)) {
		throw new WPKernelError('DeveloperError', {
			message:
				'defineResource pipeline execution must complete synchronously. Received a promise from the pipeline run.',
		});
	}

	return result;
}

function createNormalizedConfig<T, TQuery>(
	config: ResourceConfig<T, TQuery>,
	resourceName: string
): NormalizedResourceConfig<T, TQuery> {
	return {
		...config,
		name: resourceName,
	} as NormalizedResourceConfig<T, TQuery>;
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
): ResourceObject<T, TQuery> {
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

	const { namespace, resourceName } = resolveNamespaceAndName(config);
	const reporter = resolveResourceReporter({
		namespace,
		resourceName,
		override: config.reporter,
	});
	const normalizedConfig = createNormalizedConfig(config, resourceName);

	let resource: ResourceObject<T, TQuery>;

	if (isCorePipelineEnabled()) {
		const pipeline = createResourcePipeline<T, TQuery>();
		const runResult = assertSynchronousRunResult(
			pipeline.run({
				config,
				normalizedConfig,
				namespace,
				resourceName,
				reporter,
			})
		);

		if (!runResult.artifact.resource) {
			throw new WPKernelError('DeveloperError', {
				message:
					'Resource pipeline completed without producing a resource artifact.',
			});
		}

		resource = runResult.artifact.resource as ResourceObject<T, TQuery>;
	} else {
		resource = buildLegacyResource({
			config,
			normalizedConfig,
			namespace,
			resourceName,
			reporter,
		});
	}

	const definition = {
		resource: resource as ResourceObject<unknown, unknown>,
		namespace,
	};
	recordResourceDefined(definition);
	getWPKernelEventBus().emit('resource:defined', definition);

	return resource;
}
