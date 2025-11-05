import type {
	ResourceControllerMetadata,
	ResourceControllerCacheMetadata,
	ResourceMetadataHost,
} from '@wpkernel/wp-json-ast';
import {
	appendResourceCacheEvent,
	normaliseCacheSegments,
} from '@wpkernel/wp-json-ast';

describe('resource cache helpers', () => {
	it('normalises primitive segments', () => {
		expect(normaliseCacheSegments(['demo', 1, true, null])).toEqual([
			'demo',
			'1',
			'true',
			'null',
		]);
	});

	it('appends cache events to metadata', () => {
		const metadata: ResourceControllerMetadata = {
			kind: 'resource-controller',
			name: 'demo',
			identity: { type: 'number', param: 'id' },
			routes: [],
		};

		const host: ResourceMetadataHost = {
			getMetadata: () => metadata,
			setMetadata: (next) => {
				Object.assign(metadata, next);
			},
		};

		appendResourceCacheEvent({
			host,
			scope: 'list',
			operation: 'read',
			segments: ['demo', { query: true }],
			description: 'List query',
		});

		const cache = metadata.cache as ResourceControllerCacheMetadata;
		expect(cache.events).toHaveLength(1);
		expect(cache.events[0]).toMatchObject({
			scope: 'list',
			operation: 'read',
			description: 'List query',
			segments: expect.arrayContaining(['demo']),
		});
	});
});
