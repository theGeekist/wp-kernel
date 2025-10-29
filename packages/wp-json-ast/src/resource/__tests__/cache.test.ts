import type {
	ResourceControllerCacheMetadata,
	ResourceControllerMetadata,
} from '../../types';
import {
	appendResourceCacheEvent,
	buildCacheInvalidators,
	normaliseCacheSegments,
} from '../cache';
import type { ResourceMetadataHost } from '../cache';

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
			setMetadata: (
				next: Parameters<ResourceMetadataHost['setMetadata']>[0]
			) => {
				Object.assign(metadata, next as ResourceControllerMetadata);
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

	it('applies cache invalidation plans through the helper', () => {
		const metadata: ResourceControllerMetadata = {
			kind: 'resource-controller',
			name: 'demo',
			identity: { type: 'number', param: 'id' },
			routes: [],
		};

		const host: ResourceMetadataHost = {
			getMetadata: () => metadata,
			setMetadata: (
				next: Parameters<ResourceMetadataHost['setMetadata']>[0]
			) => {
				Object.assign(metadata, next as ResourceControllerMetadata);
			},
		};

		buildCacheInvalidators({
			host,
			events: [
				{
					scope: 'list',
					operation: 'invalidate',
					segments: ['demo'],
				},
				{
					scope: 'get',
					operation: 'read',
					segments: ['demo', '42'],
					description: 'Prime cache',
				},
			],
		});

		const cache = metadata.cache as ResourceControllerCacheMetadata;
		expect(cache.events).toHaveLength(2);
		expect(cache.events[0]).toMatchObject({
			scope: 'list',
			operation: 'invalidate',
			segments: ['demo'],
		});
		expect(cache.events[1]).toMatchObject({
			scope: 'get',
			operation: 'read',
			description: 'Prime cache',
			segments: expect.arrayContaining(['demo', '42']),
		});
	});
});
