import { defineResource } from '../define';
import type { ResourceObject } from '../types';
import type { ResourcePipelineRunResult } from '../../pipeline/resources/types';
import type { Reporter } from '../../reporter/types';
import * as pipelineModule from '../../pipeline/resources/createResourcePipeline';
import * as cacheModule from '../../resource/cache';
import * as eventsModule from '../../events/bus';
import {
	createWordPressTestHarness,
	withWordPressData,
} from '@wpkernel/test-utils/core';

class MockBroadcastChannel {
	public static instances: MockBroadcastChannel[] = [];

	public messages: unknown[] = [];

	public name: string;

	constructor(name: string) {
		this.name = name;
		MockBroadcastChannel.instances.push(this);
	}

	postMessage(message: unknown): void {
		this.messages.push(message);
	}

	close(): void {}
}

describe('defineResource pipeline integration', () => {
	const originalBroadcast = globalThis.BroadcastChannel;
	const originalWindowBroadcast =
		typeof window === 'undefined' ? undefined : window.BroadcastChannel;

	afterEach(() => {
		jest.restoreAllMocks();
		eventsModule.clearRegisteredResources();
		if (typeof window !== 'undefined') {
			if (originalWindowBroadcast) {
				window.BroadcastChannel = originalWindowBroadcast;
			} else {
				Reflect.deleteProperty(window, 'BroadcastChannel');
			}
		}
		if (originalBroadcast) {
			globalThis.BroadcastChannel = originalBroadcast;
		} else {
			Reflect.deleteProperty(globalThis, 'BroadcastChannel');
		}
		MockBroadcastChannel.instances = [];
	});

	it('uses the resource pipeline for resource definitions', async () => {
		const pipelineSpy = jest.spyOn(
			pipelineModule,
			'createResourcePipeline'
		);

		const resource = await defineResource<{ id: number }>({
			name: 'pipeline-test',
			routes: {
				list: { path: '/test/v1/items', method: 'GET' },
			},
		});

		expect(pipelineSpy).toHaveBeenCalledTimes(1);
		expect(resource.storeKey.endsWith('/pipeline-test')).toBe(true);
		expect(typeof resource.prefetchList).toBe('function');
	});

	it('records side effects inside the browser harness and emits broadcasts', async () => {
		(
			globalThis as { BroadcastChannel?: typeof BroadcastChannel }
		).BroadcastChannel =
			MockBroadcastChannel as unknown as typeof BroadcastChannel;
		if (typeof window !== 'undefined') {
			window.BroadcastChannel =
				MockBroadcastChannel as unknown as typeof BroadcastChannel;
		}

		const registerSpy = jest.spyOn(cacheModule, 'registerStoreKey');
		const recordSpy = jest.spyOn(eventsModule, 'recordResourceDefined');
		const emitSpy = jest.spyOn(eventsModule.getWPKernelEventBus(), 'emit');

		const mockStore = { name: 'browser-store' };
		const harness = createWordPressTestHarness({
			data: {
				createReduxStore: jest.fn().mockReturnValue(mockStore),
				register: jest.fn(),
			},
		});

		const resource = await defineResource<{ id: number }>({
			name: 'browser-side-effect',
			routes: {
				list: { path: '/test/v1/items', method: 'GET' },
			},
		});

		const store = resource.store;
		expect(store).toBeDefined();
		expect(harness.data.createReduxStore).toHaveBeenCalledWith(
			resource.storeKey,
			expect.objectContaining({
				actions: expect.any(Object),
				resolvers: expect.any(Object),
				selectors: expect.any(Object),
			})
		);
		expect(harness.data.register).toHaveBeenCalledWith(mockStore);

		expect(registerSpy).toHaveBeenCalledWith(resource.storeKey);
		expect(recordSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				namespace: 'wpk',
				resource: expect.objectContaining({
					name: 'browser-side-effect',
				}),
			})
		);
		expect(emitSpy).toHaveBeenCalledWith(
			'resource:defined',
			expect.objectContaining({ namespace: 'wpk' })
		);

		const [channel] = MockBroadcastChannel.instances;
		expect(channel).toBeDefined();
		expect(channel?.messages).toContainEqual({
			type: 'wpk.resource.defined',
			payload: expect.objectContaining({
				resourceName: 'browser-side-effect',
				storeKey: resource.storeKey,
				status: 'committed',
			}),
		});

		harness.teardown();
	});

	it('records side effects without broadcasts when WordPress globals are absent', async () => {
		delete (globalThis as { BroadcastChannel?: typeof BroadcastChannel })
			.BroadcastChannel;
		if (typeof window !== 'undefined') {
			delete (window as { BroadcastChannel?: typeof BroadcastChannel })
				.BroadcastChannel;
		}

		const registerSpy = jest.spyOn(cacheModule, 'registerStoreKey');
		const recordSpy = jest.spyOn(eventsModule, 'recordResourceDefined');
		const emitSpy = jest.spyOn(eventsModule.getWPKernelEventBus(), 'emit');

		await withWordPressData({ wp: null }, async () => {
			const resource = await defineResource<{ id: number }>({
				name: 'node-side-effect',
				routes: {
					list: { path: '/test/v1/items', method: 'GET' },
				},
			});

			expect(resource.storeKey).toBe('wpk/node-side-effect');
		});

		expect(registerSpy).toHaveBeenCalledWith('wpk/node-side-effect');
		expect(recordSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				namespace: 'wpk',
				resource: expect.objectContaining({
					name: 'node-side-effect',
				}),
			})
		);
		expect(emitSpy).toHaveBeenCalledWith(
			'resource:defined',
			expect.objectContaining({ namespace: 'wpk' })
		);
		expect(MockBroadcastChannel.instances).toHaveLength(0);
	});

	it('returns a promise when the pipeline resolves asynchronously', async () => {
		const reporter: Reporter = {
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
			child: jest.fn().mockReturnThis(),
		};

		const artifactResource: ResourceObject<{ id: number }> = {
			name: 'async-resource',
			storeKey: 'wpk/async-resource',
			store: {},
			cacheKeys: {
				list: jest.fn(),
				get: jest.fn(),
				create: jest.fn(),
				update: jest.fn(),
				remove: jest.fn(),
			},
			routes: {},
			reporter,
			invalidate: jest.fn(),
			key: jest.fn().mockReturnValue(['async-resource']),
			cache: {
				prefetch: {
					item: jest.fn(),
					list: jest.fn(),
				},
				invalidate: {
					item: jest.fn(),
					list: jest.fn(),
					all: jest.fn(),
				},
				key: jest.fn().mockReturnValue(['async-resource']),
			},
			storeApi: {
				key: 'wpk/async-resource',
				descriptor: {},
			},
			events: {
				created: 'wpk/async-resource:created',
				updated: 'wpk/async-resource:updated',
				removed: 'wpk/async-resource:removed',
			},
			fetchList: jest
				.fn()
				.mockResolvedValue({ items: [], hasMore: false }),
			fetch: jest.fn().mockResolvedValue({ id: 1 }),
			create: jest.fn().mockResolvedValue({ id: 1 }),
			update: jest.fn().mockResolvedValue({ id: 1 }),
			remove: jest.fn().mockResolvedValue(undefined),
		};

		const runResult = {
			artifact: {
				resource: artifactResource,
				namespace: 'wpk',
			},
			diagnostics: [],
			steps: [],
		} satisfies ResourcePipelineRunResult<{ id: number }, unknown>;

		jest.spyOn(pipelineModule, 'createResourcePipeline').mockReturnValue({
			run: () => Promise.resolve(runResult),
			ir: { use: jest.fn() },
			builders: { use: jest.fn() },
			extensions: { use: jest.fn() },
		} as unknown as ReturnType<
			typeof pipelineModule.createResourcePipeline
		>);

		const resourcePromise = defineResource<{ id: number }>({
			name: 'async-resource',
			routes: {
				list: { path: '/test/v1/items', method: 'GET' },
			},
		});

		expect(resourcePromise).toBeInstanceOf(Promise);

		const resource = await resourcePromise;

		expect(resource.name).toBe('async-resource');
		expect(resource.storeKey).toBe('wpk/async-resource');
	});
});
