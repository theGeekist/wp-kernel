import type {
	ResourceControllerCacheMetadata,
	ResourceControllerMetadata,
} from '../../types';
import type { ResourceMetadataHost } from '../../factories/cacheMetadata';
import { appendResourceCacheEvent, normaliseCacheSegments } from '../metadata';

describe('rest-controller metadata helpers', () => {
	it('normalises primitive segments', () => {
		expect(normaliseCacheSegments(['demo', 1, true, null])).toEqual([
			'demo',
			'1',
			'true',
			'null',
		]);
	});

	it('records cache events on the metadata host', () => {
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
