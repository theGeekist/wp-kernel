import type {
	PhpFileMetadata,
	ResourceControllerCacheEvent,
	ResourceControllerMetadata,
} from '../types';
import {
	appendResourceControllerCacheEvent,
	type ResourceMetadataHost,
} from '../factories/cacheMetadata';

function createHost(metadata: PhpFileMetadata): ResourceMetadataHost & {
	readonly setMetadata: jest.Mock<void, [PhpFileMetadata]>;
} {
	const host: any = {
		current: metadata,
		getMetadata(): PhpFileMetadata {
			return this.current;
		},
		setMetadata: jest.fn(function (next: PhpFileMetadata) {
			this.current = next;
		}),
	};

	return host as ResourceMetadataHost & {
		readonly setMetadata: jest.Mock<void, [PhpFileMetadata]>;
	};
}

describe('appendResourceControllerCacheEvent', () => {
	it('appends cache events to resource metadata', () => {
		const metadata: ResourceControllerMetadata = {
			kind: 'resource-controller',
			name: 'job',
			identity: { type: 'string', param: 'slug' },
			routes: [],
		};
		const host = createHost(metadata);
		const event: ResourceControllerCacheEvent = {
			scope: 'list',
			operation: 'read',
			segments: ['job', 'list'],
		};

		appendResourceControllerCacheEvent(host, event);

		expect(host.setMetadata).toHaveBeenCalledTimes(1);
		const [next] = host.setMetadata.mock.calls[0] || [];
		if (next!.kind !== 'resource-controller') {
			throw new Error('metadata mutated to unexpected kind');
		}
		expect((next as any)?.cache?.events).toEqual([
			{
				scope: 'list',
				operation: 'read',
				segments: ['job', 'list'],
			},
		]);
		expect(metadata.cache).toBeUndefined();
	});

	it('preserves existing events and avoids shared references', () => {
		const existingEvent: ResourceControllerCacheEvent = {
			scope: 'get',
			operation: 'read',
			segments: ['job', 'get'],
		};
		const metadata: ResourceControllerMetadata = {
			kind: 'resource-controller',
			name: 'job',
			identity: { type: 'number', param: 'id' },
			routes: [],
			cache: { events: [existingEvent] },
		};
		const host = createHost(metadata);
		const event: ResourceControllerCacheEvent = {
			scope: 'list',
			operation: 'prime',
			segments: ['job', 'list'],
		};

		appendResourceControllerCacheEvent(host, event);

		const [next] = host.setMetadata.mock.calls[0] || [];
		if (next!.kind !== 'resource-controller') {
			throw new Error('metadata mutated to unexpected kind');
		}

		expect((next as any)?.cache?.events[0]).toBe(existingEvent);
		expect((next as any)?.cache?.events[1]).toEqual({
			scope: 'list',
			operation: 'prime',
			segments: ['job', 'list'],
		});

		(event as any).segments.push('mutated');
		expect((next as any)?.cache?.events[1]).toEqual({
			scope: 'list',
			operation: 'prime',
			segments: ['job', 'list'],
		});
	});

	it('ignores non resource-controller metadata', () => {
		const metadata: PhpFileMetadata = {
			kind: 'policy-helper',
			name: 'demo',
		};
		const host = createHost(metadata);

		appendResourceControllerCacheEvent(host, {
			scope: 'list',
			operation: 'invalidate',
			segments: ['job', 'list'],
		});

		expect(host.setMetadata).not.toHaveBeenCalled();
	});
});
