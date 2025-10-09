import { defineResource } from '../define';
import type { Reporter } from '../../reporter';
import type { ResourceObject, ResourceStore } from '../types';
import { KernelError } from '../../error/KernelError';

jest.mock('../../http/fetch', () => ({
	fetch: jest.fn(),
}));

const transportFetch = jest.requireMock('../../http/fetch').fetch as jest.Mock;

type LogEntry = {
	level: 'debug' | 'info' | 'error' | 'warn';
	message: string;
	context?: unknown;
};

function createReporterSpy(): { reporter: Reporter; logs: LogEntry[] } {
	const logs: LogEntry[] = [];
	const reporter: Reporter = {
		info(message, context) {
			logs.push({ level: 'info', message, context });
		},
		warn(message, context) {
			logs.push({ level: 'warn', message, context });
		},
		error(message, context) {
			logs.push({ level: 'error', message, context });
		},
		debug(message, context) {
			logs.push({ level: 'debug', message, context });
		},
		child() {
			return reporter;
		},
	};

	return { reporter, logs };
}

function getResourceStore<T, TQuery = unknown>(
	resource: ResourceObject<T, TQuery>
): ResourceStore<T, TQuery> {
	return resource.store as ResourceStore<T, TQuery>;
}

describe('resource reporters', () => {
	beforeEach(() => {
		transportFetch.mockReset();
	});

	it('emits debug and info logs for successful list fetches', async () => {
		const { reporter, logs } = createReporterSpy();
		transportFetch.mockResolvedValue({
			data: { items: [{ id: 1 }], total: 1 },
		});

		const resource = defineResource<{ id: number }>({
			name: 'thing',
			reporter,
			routes: {
				list: { path: '/wpk/v1/things', method: 'GET' },
			},
		});

		await resource.fetchList!({ search: 'test' });

		expect(logs).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					level: 'debug',
					message: 'resource.client.fetchList.start',
				}),
				expect.objectContaining({
					level: 'info',
					message: 'resource.client.fetchList.success',
					context: expect.objectContaining({ count: 1, total: 1 }),
				}),
			])
		);
	});

	it('logs errors when list fetch fails', async () => {
		const { reporter, logs } = createReporterSpy();
		transportFetch.mockRejectedValue('boom');

		const resource = defineResource<{ id: number }>({
			name: 'thing',
			reporter,
			routes: {
				list: { path: '/wpk/v1/things', method: 'GET' },
			},
		});

		await expect(resource.fetchList!()).rejects.toEqual('boom');

		expect(logs).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					level: 'error',
					message: 'resource.client.fetchList.error',
				}),
			])
		);
	});

	it('normalizes array responses when fetching lists', async () => {
		const { reporter, logs } = createReporterSpy();
		transportFetch.mockResolvedValue({
			data: [{ id: 1 }, { id: 2 }],
		});

		const resource = defineResource<{ id: number }>({
			name: 'thing',
			reporter,
			routes: {
				list: { path: '/wpk/v1/things', method: 'GET' },
			},
		});

		const result = await resource.fetchList!();

		expect(result.items).toHaveLength(2);
		expect(logs).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					level: 'info',
					message: 'resource.client.fetchList.success',
					context: expect.objectContaining({ count: 2 }),
				}),
			])
		);
	});

	it('falls back to a noop reporter when none is provided', async () => {
		transportFetch.mockResolvedValue({
			data: { items: [], total: 0, hasMore: false },
		});

		const resource = defineResource<{ id: number }>({
			name: 'thing',
			routes: {
				list: { path: '/wpk/v1/things', method: 'GET' },
			},
		});

		await expect(resource.fetchList!()).resolves.toEqual({
			items: [],
			total: 0,
			hasMore: false,
			nextCursor: undefined,
		});
	});

	it('logs fetch success for single items', async () => {
		const { reporter, logs } = createReporterSpy();
		transportFetch.mockResolvedValue({
			data: { id: 7 },
		});

		const resource = defineResource<{ id: number }>({
			name: 'thing',
			reporter,
			routes: {
				get: { path: '/wpk/v1/things/:id', method: 'GET' },
			},
		});

		const item = await resource.fetch!(7);

		expect(item).toEqual({ id: 7 });
		expect(logs).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					level: 'debug',
					message: 'resource.client.fetch.start',
				}),
				expect.objectContaining({
					level: 'info',
					message: 'resource.client.fetch.success',
					context: expect.objectContaining({ id: 7 }),
				}),
			])
		);
	});

	it('logs fetch errors when transport rejects', async () => {
		const { reporter, logs } = createReporterSpy();
		transportFetch.mockRejectedValue('fetch failed');

		const resource = defineResource<{ id: number }>({
			name: 'thing',
			reporter,
			routes: {
				get: { path: '/wpk/v1/things/:id', method: 'GET' },
			},
		});

		await expect(resource.fetch!(9)).rejects.toEqual('fetch failed');

		expect(logs).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					level: 'error',
					message: 'resource.client.fetch.error',
					context: expect.objectContaining({ id: 9 }),
				}),
			])
		);
	});

	it('logs create lifecycle on success and propagates item id', async () => {
		const { reporter, logs } = createReporterSpy();
		transportFetch.mockResolvedValue({
			data: { id: 15, title: 'Created' },
		});

		const resource = defineResource<{ id: number; title: string }>({
			name: 'thing',
			reporter,
			routes: {
				create: { path: '/wpk/v1/things', method: 'POST' },
			},
		});

		const created = await resource.create!({ title: 'Created' });

		expect(created).toEqual({ id: 15, title: 'Created' });
		expect(logs).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					level: 'debug',
					message: 'resource.client.create.start',
				}),
				expect.objectContaining({
					level: 'info',
					message: 'resource.client.create.success',
					context: expect.objectContaining({ id: 15 }),
				}),
			])
		);
	});

	it('logs create errors when transport rejects', async () => {
		const { reporter, logs } = createReporterSpy();
		transportFetch.mockRejectedValue('create failed');

		const resource = defineResource<{ id: number; title: string }>({
			name: 'thing',
			reporter,
			routes: {
				create: { path: '/wpk/v1/things', method: 'POST' },
			},
		});

		await expect(resource.create!({ title: 'New' })).rejects.toEqual(
			'create failed'
		);

		expect(logs).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					level: 'error',
					message: 'resource.client.create.error',
				}),
			])
		);
	});

	it('logs update lifecycle for success and failure', async () => {
		const { reporter, logs } = createReporterSpy();
		transportFetch.mockResolvedValueOnce({
			data: { id: 21, title: 'Updated' },
		});

		const resource = defineResource<{ id: number; title: string }>({
			name: 'thing',
			reporter,
			routes: {
				update: { path: '/wpk/v1/things/:id', method: 'PUT' },
			},
		});

		const updated = await resource.update!(21, { title: 'Updated' });

		expect(updated).toEqual({ id: 21, title: 'Updated' });
		expect(logs).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					level: 'debug',
					message: 'resource.client.update.start',
				}),
				expect.objectContaining({
					level: 'info',
					message: 'resource.client.update.success',
					context: expect.objectContaining({ id: 21 }),
				}),
			])
		);

		logs.length = 0;
		transportFetch.mockRejectedValueOnce('update failed');

		await expect(resource.update!(21, { title: 'Retry' })).rejects.toEqual(
			'update failed'
		);

		expect(logs).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					level: 'error',
					message: 'resource.client.update.error',
					context: expect.objectContaining({ id: 21 }),
				}),
			])
		);
	});

	it('logs remove success when transport completes', async () => {
		const { reporter, logs } = createReporterSpy();
		transportFetch.mockResolvedValue(undefined);

		const resource = defineResource<{ id: number }>({
			name: 'thing',
			reporter,
			routes: {
				remove: { path: '/wpk/v1/things/:id', method: 'DELETE' },
			},
		});

		await expect(resource.remove!(12)).resolves.toBeUndefined();

		expect(logs).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					level: 'debug',
					message: 'resource.client.remove.start',
				}),
				expect.objectContaining({
					level: 'info',
					message: 'resource.client.remove.success',
					context: expect.objectContaining({ id: 12 }),
				}),
			])
		);
	});

	it('logs resolver lifecycle for getItem success', async () => {
		const { reporter, logs } = createReporterSpy();
		const resource = defineResource<{ id: number }>({
			name: 'thing',
			reporter,
			routes: {
				get: { path: '/wpk/v1/things/:id', method: 'GET' },
			},
		});

		const item = { id: 1 };
		resource.fetch = jest.fn().mockResolvedValue(item);

		const store = getResourceStore(resource);
		const iterator = store.resolvers.getItem(1);
		const effect = iterator.next();
		const pending = effect.value as { promise: Promise<unknown> };
		await pending.promise;
		iterator.next(item);
		iterator.next();

		expect(logs).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					level: 'debug',
					message: 'resource.store.resolver.start',
				}),
				expect.objectContaining({
					level: 'info',
					message: 'resource.store.resolver.success',
				}),
			])
		);
	});

	it('logs resolver lifecycle for getItems success with fallback cache key', async () => {
		const { reporter, logs } = createReporterSpy();
		const resource = defineResource<{ id: number }>({
			name: 'thing',
			reporter,
			routes: {
				list: { path: '/wpk/v1/things', method: 'GET' },
			},
		});

		const response = {
			items: [{ id: 1 }],
			total: 1,
			hasMore: false,
			nextCursor: undefined,
		};
		resource.fetchList = jest.fn().mockResolvedValue(response);
		resource.cacheKeys.list = () => [];

		const store = getResourceStore(resource);
		const iterator = store.resolvers.getItems({ page: 1 });
		iterator.next();
		const effect = iterator.next();
		const pending = effect.value as { promise: Promise<unknown> };
		await pending.promise;
		iterator.next(response);
		iterator.next();
		iterator.next();

		expect(logs).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					level: 'debug',
					message: 'resource.store.resolver.start',
					context: expect.objectContaining({
						cacheKey: 'thing:list:{"page":1}',
					}),
				}),
				expect.objectContaining({
					level: 'info',
					message: 'resource.store.resolver.success',
					context: expect.objectContaining({ count: 1, total: 1 }),
				}),
			])
		);
	});

	it('logs missing getItems route before throwing', () => {
		const { reporter, logs } = createReporterSpy();
		const resource = defineResource<{ id: number }>({
			name: 'thing',
			reporter,
			routes: {
				get: { path: '/wpk/v1/things/:id', method: 'GET' },
			},
		});

		expect(() => {
			const store = getResourceStore(resource);
			const iterator = store.resolvers.getItems();
			iterator.next();
		}).toThrow(KernelError);

		expect(logs).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					level: 'error',
					message: 'resource.store.missingRoute',
					context: expect.objectContaining({ operation: 'getItems' }),
				}),
			])
		);
	});

	it('logs resolver errors when getItems fetch rejects', async () => {
		const { reporter, logs } = createReporterSpy();
		const resource = defineResource<{ id: number }>({
			name: 'thing',
			reporter,
			routes: {
				list: { path: '/wpk/v1/things', method: 'GET' },
			},
		});

		const failure = 'list failed';
		resource.fetchList = jest.fn().mockRejectedValue(failure);

		const store = getResourceStore(resource);
		const iterator = store.resolvers.getItems({ page: 2 });
		iterator.next();
		const effect = iterator.next();
		const pending = effect.value as { promise: Promise<unknown> };
		await pending.promise.catch(() => undefined);
		iterator.throw(failure);
		iterator.next();
		iterator.next();

		expect(logs).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					level: 'error',
					message: 'resource.store.resolver.error',
					context: expect.objectContaining({ operation: 'getItems' }),
				}),
			])
		);
	});

	it('logs resolver errors when fetch rejects', async () => {
		const { reporter, logs } = createReporterSpy();
		const resource = defineResource<{ id: number }>({
			name: 'thing',
			reporter,
			routes: {
				get: { path: '/wpk/v1/things/:id', method: 'GET' },
			},
		});

		const failure = 'nope';
		resource.fetch = jest.fn().mockRejectedValue(failure);

		const store = getResourceStore(resource);
		const iterator = store.resolvers.getItem(1);
		const effect = iterator.next();
		const pending = effect.value as { promise: Promise<unknown> };
		await pending.promise.catch(() => undefined);
		iterator.throw(failure);
		iterator.next();

		expect(logs).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					level: 'error',
					message: 'resource.store.resolver.error',
				}),
			])
		);
	});

	it('logs missing list route errors before throwing', () => {
		const { reporter, logs } = createReporterSpy();
		const resource = defineResource<{ id: number }>({
			name: 'thing',
			reporter,
			routes: {
				get: { path: '/wpk/v1/things/:id', method: 'GET' },
			},
		});

		expect(() => {
			const store = getResourceStore(resource);
			const iterator = store.resolvers.getList();
			iterator.next();
		}).toThrow(KernelError);

		expect(logs).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					level: 'error',
					message: 'resource.store.missingRoute',
					context: expect.objectContaining({ operation: 'getList' }),
				}),
			])
		);
	});

	it('logs remove errors when client transport fails', async () => {
		const { reporter, logs } = createReporterSpy();
		transportFetch.mockRejectedValue('delete failed');

		const resource = defineResource<{ id: number }>({
			name: 'thing',
			reporter,
			routes: {
				remove: { path: '/wpk/v1/things/:id', method: 'DELETE' },
			},
		});

		await expect(resource.remove!(42)).rejects.toEqual('delete failed');

		expect(logs).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					level: 'error',
					message: 'resource.client.remove.error',
					context: expect.objectContaining({ id: 42 }),
				}),
			])
		);
	});

	it('logs missing route errors before throwing', () => {
		const { reporter, logs } = createReporterSpy();
		const resource = defineResource<{ id: number }>({
			name: 'thing',
			reporter,
			routes: {
				list: { path: '/wpk/v1/things', method: 'GET' },
			},
		});

		expect(() => {
			const store = getResourceStore(resource);
			const iterator = store.resolvers.getItem(1);
			iterator.next();
		}).toThrow(KernelError);

		expect(logs).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					level: 'error',
					message: 'resource.store.missingRoute',
				}),
			])
		);
	});
});
