import { buildResourceCacheKeysPlan } from '@wpkernel/wp-json-ast';
import type { IRResource } from '../../ir';
import { type StorageArtifacts } from './controller.planTypes';
import type { ResourceStorageHelperState } from './types';

interface BuildStorageArtifactsOptions {
	readonly resource: IRResource;
	readonly storageState: ResourceStorageHelperState;
}

interface ReadStorageArtifactsOptions {
	readonly state: ResourceStorageHelperState;
	readonly resourceName: string;
}

/**
 * Reads helper artifacts emitted by storage helpers for the given resource.
 *
 * @param    options
 * @category Builders
 */
export function buildStorageArtifacts(
	options: BuildStorageArtifactsOptions
): StorageArtifacts {
	const storageMode = options.resource.storage?.mode;

	switch (storageMode) {
		case 'wp-taxonomy':
			return buildTaxonomyStorageArtifactsFromState({
				state: options.storageState,
				resourceName: options.resource.name,
			});
		case 'transient':
			return buildTransientStorageArtifactsFromState({
				state: options.storageState,
				resourceName: options.resource.name,
			});
		case 'wp-option':
			return buildWpOptionStorageArtifactsFromState({
				state: options.storageState,
				resourceName: options.resource.name,
			});
		default:
			return {
				helperMethods: [],
				helperSignatures: [],
			} satisfies StorageArtifacts;
	}
}

/**
 * Computes mutation metadata used by the controller planner to mark wp-post channels.
 *
 * @param    resource
 * @category Builders
 */
export function resolveRouteMutationMetadata(
	resource: IRResource
): { readonly channelTag: string } | undefined {
	if (resource.storage?.mode === 'wp-post') {
		return {
			channelTag: 'resource.wpPost.mutation',
		};
	}

	return undefined;
}

/**
 * Normalises the resource cache-key config into the structure expected by wp-json-ast.
 *
 * @param    resource
 * @category Builders
 */
export function buildCacheKeyPlan(resource: Pick<IRResource, 'cacheKeys'>) {
	const { cacheKeys } = resource;

	return buildResourceCacheKeysPlan({
		list: { segments: cacheKeys.list.segments },
		get: { segments: cacheKeys.get.segments },
		...(cacheKeys.create
			? { create: { segments: cacheKeys.create.segments } }
			: {}),
		...(cacheKeys.update
			? { update: { segments: cacheKeys.update.segments } }
			: {}),
		...(cacheKeys.remove
			? { remove: { segments: cacheKeys.remove.segments } }
			: {}),
	});
}

function buildTaxonomyStorageArtifactsFromState(
	options: ReadStorageArtifactsOptions
): StorageArtifacts {
	const artifacts = options.state.wpTaxonomy.get(options.resourceName);

	return {
		helperMethods: artifacts?.helperMethods ?? [],
		helperSignatures: artifacts?.helperSignatures ?? [],
		routeHandlers: artifacts?.routeHandlers,
	} satisfies StorageArtifacts;
}

function buildTransientStorageArtifactsFromState(
	options: ReadStorageArtifactsOptions
): StorageArtifacts {
	const artifacts = options.state.transient.get(options.resourceName);

	return {
		helperMethods: artifacts?.helperMethods ?? [],
		helperSignatures: [],
		transientHandlers: artifacts?.routeHandlers,
	} satisfies StorageArtifacts;
}

function buildWpOptionStorageArtifactsFromState(
	options: ReadStorageArtifactsOptions
): StorageArtifacts {
	const artifacts = options.state.wpOption.get(options.resourceName);

	return {
		helperMethods: artifacts?.helperMethods ?? [],
		helperSignatures: [],
		optionHandlers: artifacts?.routeHandlers,
	} satisfies StorageArtifacts;
}
