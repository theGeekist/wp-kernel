import type { IRResource } from '../../src/ir/publicTypes';

export function createResourceBuilderMock(
	resources: IRResource[] = [createDefaultResource()]
) {
	return {
		buildResources: jest.fn(async () => resources),
	};
}

export function createDefaultResource(): IRResource {
	return {
		id: 'res:thing',
		name: 'Thing',
		controllerClass: 'Demo\\ThingController',
		schemaKey: 'thing',
		schemaProvenance: 'manual',
		routes: [],
		cacheKeys: {
			list: { segments: [], source: 'default' },
			get: { segments: [], source: 'default' },
			create: { segments: [], source: 'default' },
			update: { segments: [], source: 'default' },
			remove: { segments: [], source: 'default' },
		},
		identity: { type: 'number', param: 'id' },
		hash: { algo: 'sha256', inputs: [], value: 'stub' },
		warnings: [],
	};
}
