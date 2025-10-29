import {
	RESOURCE_BUILDER_KIND,
	RESOURCE_FRAGMENT_KIND,
} from '../../resources/types';
import type { HelperDescriptor } from '../../types';

export type ResourceLifecycleResponsibility =
	| 'namespace'
	| 'reporter'
	| 'validation'
	| 'client'
	| 'cache-keys'
	| 'grouped-api'
	| 'builder'
	| 'registry';

export interface CoreResourceHelperDescriptor extends HelperDescriptor {
	readonly responsibility: ResourceLifecycleResponsibility;
}

/**
 * Build the canonical helper descriptor catalogue for resource orchestration.
 */
export function buildCoreResourceHelperCatalog(): readonly CoreResourceHelperDescriptor[] {
	return [
		{
			key: 'resource.namespace.resolve',
			kind: RESOURCE_FRAGMENT_KIND,
			mode: 'extend',
			priority: 130,
			dependsOn: [],
			responsibility: 'namespace',
		},
		{
			key: 'resource.reporter.resolve',
			kind: RESOURCE_FRAGMENT_KIND,
			mode: 'extend',
			priority: 120,
			dependsOn: ['resource.namespace.resolve'],
			responsibility: 'reporter',
		},
		{
			key: 'resource.config.validate',
			kind: RESOURCE_FRAGMENT_KIND,
			mode: 'extend',
			priority: 110,
			dependsOn: ['resource.reporter.resolve'],
			responsibility: 'validation',
		},
		{
			key: 'resource.client.build',
			kind: RESOURCE_FRAGMENT_KIND,
			mode: 'extend',
			priority: 100,
			dependsOn: ['resource.config.validate'],
			responsibility: 'client',
		},
		{
			key: 'resource.cacheKeys.build',
			kind: RESOURCE_FRAGMENT_KIND,
			mode: 'extend',
			priority: 90,
			dependsOn: ['resource.config.validate'],
			responsibility: 'cache-keys',
		},
		{
			key: 'resource.groupedApi.assemble',
			kind: RESOURCE_BUILDER_KIND,
			mode: 'extend',
			priority: 80,
			dependsOn: [],
			responsibility: 'grouped-api',
		},
		{
			key: 'resource.object.build',
			kind: RESOURCE_BUILDER_KIND,
			mode: 'extend',
			priority: 70,
			dependsOn: ['resource.groupedApi.assemble'],
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
