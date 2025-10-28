import type {
	PhpFileMetadata,
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

	it('normalises complex segments to stable JSON strings', () => {
		const symbol = Symbol('demo');

		expect(
			normaliseCacheSegments([
				{ b: 1, a: 2 },
				['value'],
				undefined,
				symbol,
			])
		).toEqual(['{"a":2,"b":1}', '["value"]', 'undefined', 'demo']);
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

	it('clones stored segments to avoid accidental mutation', () => {
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

		const segments = ['demo'];
		appendResourceCacheEvent({
			host,
			scope: 'list',
			operation: 'read',
			segments,
		});

		segments.push('mutated');

		const cache = metadata.cache as ResourceControllerCacheMetadata;
		const event = cache.events[0];
		expect(event).toBeDefined();
		expect(event?.segments).toEqual(['demo']);
	});

	it('ignores metadata that does not describe a resource controller', () => {
		const metadata: PhpFileMetadata = {
			kind: 'base-controller',
		};
		const setMetadata = jest.fn();

		const host: ResourceMetadataHost = {
			getMetadata: () => metadata,
			setMetadata,
		};

		appendResourceCacheEvent({
			host,
			scope: 'list',
			operation: 'read',
			segments: ['demo'],
		});

		expect(setMetadata).not.toHaveBeenCalled();
	});
});
