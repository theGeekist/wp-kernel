import type {
	WPKernelConfigFabrication,
	WPKernelConfigFabricatorOptions,
	CapabilityDescriptor,
	CapabilityMap,
} from './types.js';
import type { ResourceConfig } from '@wpkernel/core/resource';

export function fabricateWPKernelConfig(
	options: WPKernelConfigFabricatorOptions = {}
): WPKernelConfigFabrication {
	const namespace = options.namespace ?? `wpk-e2e-${Date.now()}`;
	const storageMode = options.storage ?? 'transient';

	const resource: ResourceConfig<unknown, Record<string, unknown>> = {
		name: 'integration-item',
		identity: {
			type: 'number',
			param: 'id',
		},
		routes: createRoutes(options.includeRemoteRoutes === true),
		storage: createStorage(storageMode),
		schema: 'auto',
	};

	const config = {
		version: 1,
		namespace,
		schemas: {},
		resources: {
			item: resource,
		},
	};

	const capabilities = options.includeCapabilities
		? buildCapabilityMap(resource.name)
		: {};

	const blocks = {
		ssr: options.includeSSRBlock ? true : undefined,
		js: options.includeJsBlock ? true : undefined,
	};

	return {
		config,
		capabilities,
		blocks,
	};
}

function createRoutes(
	includeRemote: boolean
): ResourceConfig<unknown, unknown>['routes'] {
	const base = {
		list: {
			path: '/integration/v1/items',
			method: 'GET',
		},
		get: {
			path: '/integration/v1/items/:id',
			method: 'GET',
		},
	} as ResourceConfig<unknown, unknown>['routes'];

	if (includeRemote) {
		base.create = {
			path: 'https://remote.example.com/integration/v1/items',
			method: 'POST',
		};
	} else {
		base.create = {
			path: '/integration/v1/items',
			method: 'POST',
		};
	}

	return base;
}

function createStorage(
	storage: WPKernelConfigFabricatorOptions['storage']
): ResourceConfig<unknown, unknown>['storage'] {
	switch (storage) {
		case 'wp-post':
			return {
				mode: 'wp-post',
				postType: 'integration-item',
			};
		case 'wp-option':
			return {
				mode: 'wp-option',
				option: 'integration_item',
			};
		case 'wp-taxonomy':
			return {
				mode: 'wp-taxonomy',
				taxonomy: 'integration_item',
			};
		case 'transient':
		default:
			return {
				mode: 'transient',
			};
	}
}

function buildCapabilityMap(resourceName: string): CapabilityMap {
	const descriptors: CapabilityDescriptor[] = [
		'manage_options',
		{
			capability: 'manage_integration_item',
			appliesTo: 'resource',
		},
		{
			capability: 'edit_integration_item',
			appliesTo: 'object',
			binding: 'id',
		},
	];

	return {
		resources: {
			[resourceName]: descriptors,
		},
	};
}
