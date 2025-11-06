import {
	RESOURCE_BUILDER_KIND,
	RESOURCE_FRAGMENT_KIND,
} from '../../resources/types';
import type { HelperDescriptor } from '@wpkernel/pipeline';

export type ResourceLifecycleResponsibility =
	| 'validation'
	| 'client'
	| 'cache-keys'
	| 'builder'
	| 'registry';

export interface CoreResourceHelperDescriptor extends HelperDescriptor {
	readonly responsibility: ResourceLifecycleResponsibility;
}

/**
 * Create the canonical helper descriptor catalogue for resource orchestration.
 */
export function createCoreResourceHelperCatalog(): readonly CoreResourceHelperDescriptor[] {
	return [
		{
			key: 'resource.config.validate',
			kind: RESOURCE_FRAGMENT_KIND,
			mode: 'extend',
			priority: 100,
			dependsOn: [],
			responsibility: 'validation',
		},
		{
			key: 'resource.client.build',
			kind: RESOURCE_FRAGMENT_KIND,
			mode: 'extend',
			priority: 90,
			dependsOn: ['resource.config.validate'],
			responsibility: 'client',
		},
		{
			key: 'resource.cacheKeys.build',
			kind: RESOURCE_FRAGMENT_KIND,
			mode: 'extend',
			priority: 80,
			dependsOn: ['resource.client.build'],
			responsibility: 'cache-keys',
		},
		{
			key: 'resource.object.build',
			kind: RESOURCE_BUILDER_KIND,
			mode: 'extend',
			priority: 70,
			dependsOn: ['resource.cacheKeys.build'],
			responsibility: 'builder',
		},
		{
			key: 'resource.registry.record',
			kind: RESOURCE_BUILDER_KIND,
			mode: 'extend',
			priority: 60,
			dependsOn: ['resource.object.build'],
			responsibility: 'registry',
		},
	];
}
