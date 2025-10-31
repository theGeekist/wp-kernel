/* eslint-disable jsdoc/check-tag-names -- allow Typedoc @category tags */
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
import type { Reporter } from '../reporter';
import { createResourcePipeline } from '../pipeline/resources/createResourcePipeline';
import type {
	ResourcePipelineRunOptions,
	ResourcePipelineRunResult,
} from '../pipeline/resources/types';
import type { MaybePromise } from '../pipeline/types';
import { resolveNamespaceAndName } from './namespace';
import { resolveResourceReporter } from './reporter';
import type { NormalizedResourceConfig } from './buildResourceObject';

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

function buildNormalizedConfig<T, TQuery>(
	config: ResourceConfig<T, TQuery>,
	resourceName: string
): NormalizedResourceConfig<T, TQuery> {
	return {
		...config,
		name: resourceName,
	} as NormalizedResourceConfig<T, TQuery>;
}

function buildResourceDefinitionOptions<T, TQuery>({
	config,
	namespace,
	resourceName,
	reporter,
}: {
	readonly config: ResourceConfig<T, TQuery>;
	readonly namespace: string;
	readonly resourceName: string;
	readonly reporter: Reporter;
}): ResourcePipelineRunOptions<T, TQuery> {
	return {
		config,
		normalizedConfig: buildNormalizedConfig(config, resourceName),
		namespace,
		resourceName,
		reporter,
	} satisfies ResourcePipelineRunOptions<T, TQuery>;
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
 * @category Resource
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
	const runOptions = buildResourceDefinitionOptions({
		config,
		namespace,
		resourceName,
		reporter,
	});
	const pipeline = createResourcePipeline<T, TQuery>();
	const runResult = assertSynchronousRunResult(pipeline.run(runOptions));

	if (!runResult.artifact.resource) {
		throw new WPKernelError('DeveloperError', {
			message:
				'Resource pipeline completed without producing a resource artifact.',
		});
	}

	return runResult.artifact.resource as ResourceObject<T, TQuery>;
}

/* eslint-enable jsdoc/check-tag-names */
