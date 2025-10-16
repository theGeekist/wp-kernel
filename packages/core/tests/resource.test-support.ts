import { WPK_NAMESPACE } from '../src/contracts';
import { createNoopReporter } from '../src/reporter';
import type {
	ResourceObject,
	ListResponse,
	ResourceConfig,
} from '../src/resource/types';
import { defineResource } from '../src/resource/define';
import {
	createWordPressTestHarness,
	type WordPressHarnessOverrides,
	type WordPressTestHarness,
	type WithWordPressDataOptions,
	type ApiFetchHarness,
	type ApiFetchHarnessOptions,
	createApiFetchHarness,
	withWordPressData,
} from '@wpkernel/test-utils/core';

type CacheOperation = 'list' | 'get' | 'create' | 'update' | 'remove';

export interface MockThing {
	id: number;
	title: string;
	status: string;
}

export interface MockThingQuery {
	q?: string;
	status?: string;
}

export interface MockResourceSetup {
	resource: ResourceObject<MockThing, MockThingQuery>;
	listResponse: ListResponse<MockThing>;
}

export interface ResourceHarnessSetup {
	harness: WordPressTestHarness;
	data: WordPressTestHarness['data'] & {
		resolveSelect: jest.Mock;
	};
	dispatch: jest.Mock;
	select: jest.Mock;
	register: jest.Mock;
	createReduxStore: jest.Mock;
	resolveSelect: jest.Mock;
}

export const defineTestResource = <T, TQuery>(
	config: ResourceConfig<T, TQuery>
) => defineResource<T, TQuery>(config);

const clone = <T>(value: T): T => {
	if (Array.isArray(value)) {
		return value.map((item) => clone(item)) as T;
	}

	if (value && typeof value === 'object') {
		return Object.entries(value as Record<string, unknown>).reduce(
			(acc, [key, entry]) => {
				(acc as Record<string, unknown>)[key] = clone(entry);
				return acc;
			},
			{} as unknown as T
		);
	}

	return value;
};

const defaultItems: MockThing[] = [
	{ id: 1, title: 'Thing One', status: 'active' },
	{ id: 2, title: 'Thing Two', status: 'inactive' },
];

const createMockListResponse = (
	overrides: Partial<ListResponse<MockThing>> = {}
): ListResponse<MockThing> => ({
	items: clone(defaultItems),
	total: defaultItems.length,
	hasMore: false,
	...overrides,
});

const mergeNested = <T extends Record<string, unknown>>(
	base: T,
	override?: Partial<T>
): T => {
	if (!override) {
		return base;
	}

	const merged: Record<string, unknown> = { ...base };

	for (const [key, value] of Object.entries(override)) {
		const current = merged[key];
		if (
			value &&
			typeof value === 'object' &&
			!Array.isArray(value) &&
			current &&
			typeof current === 'object' &&
			!Array.isArray(current)
		) {
			merged[key] = mergeNested(
				current as Record<string, unknown>,
				value as Record<string, unknown>
			);
		} else {
			merged[key] = value as unknown;
		}
	}

	return merged as T;
};

const mergeResource = (
	base: ResourceObject<MockThing, MockThingQuery>,
	override?: Partial<ResourceObject<MockThing, MockThingQuery>>
): ResourceObject<MockThing, MockThingQuery> => {
	if (!override) {
		return base;
	}

	const merged = {
		...base,
		...override,
		cacheKeys: { ...base.cacheKeys, ...override.cacheKeys },
		routes: { ...base.routes, ...override.routes },
		select: { ...base.select, ...override.select },
		get: { ...base.get, ...override.get },
		mutate: { ...base.mutate, ...override.mutate },
		cache: base.cache
			? {
					...base.cache,
					...override.cache,
					prefetch: mergeNested(
						base.cache.prefetch,
						override.cache?.prefetch
					),
					invalidate: mergeNested(
						base.cache.invalidate,
						override.cache?.invalidate
					),
				}
			: override.cache,
		storeApi: base.storeApi
			? { ...base.storeApi, ...override.storeApi }
			: override.storeApi,
		events: base.events
			? { ...base.events, ...override.events }
			: override.events,
	} as ResourceObject<MockThing, MockThingQuery>;

	return merged;
};

const createCacheKey = (resource: ResourceObject<MockThing, MockThingQuery>) =>
	jest.fn((operation: CacheOperation, params?: unknown) => {
		const generator = resource.cacheKeys?.[operation] as
			| ((
					input?: unknown
			  ) => (string | number | boolean | null | undefined)[])
			| undefined;
		const segments = generator ? generator(params) : [];

		return segments.filter(
			(segment): segment is string | number | boolean =>
				segment !== null && segment !== undefined
		);
	});

export const createMockResource = (
	override?: Partial<ResourceObject<MockThing, MockThingQuery>>,
	options: { listResponse?: ListResponse<MockThing> } = {}
): MockResourceSetup => {
	const listResponse = options.listResponse ?? createMockListResponse();

	const storeNamespace = `${WPK_NAMESPACE}/thing` as const;
	const eventNamespace = `${WPK_NAMESPACE}.thing` as const;

	const baseResource = {
		name: 'thing',
		storeKey: storeNamespace,
		reporter: createNoopReporter(),
		cacheKeys: {
			list: (query?: MockThingQuery) => [
				'thing',
				'list',
				JSON.stringify(query ?? {}),
			],
			get: (id?: string | number) => ['thing', 'get', id ?? ''],
			create: (payload?: unknown) => [
				'thing',
				'create',
				JSON.stringify(payload ?? {}),
			],
			update: (id?: string | number) => ['thing', 'update', id ?? ''],
			remove: (id?: string | number) => ['thing', 'remove', id ?? ''],
		},
		routes: {
			list: { path: '/my-plugin/v1/things', method: 'GET' },
			get: { path: '/my-plugin/v1/things/:id', method: 'GET' },
			create: { path: '/my-plugin/v1/things', method: 'POST' },
			update: { path: '/my-plugin/v1/things/:id', method: 'PUT' },
			remove: { path: '/my-plugin/v1/things/:id', method: 'DELETE' },
		},
		fetchList: jest.fn().mockResolvedValue(listResponse),
		fetch: jest.fn().mockResolvedValue(
			listResponse.items[0] ?? {
				id: 1,
				title: 'Thing One',
				status: 'active',
			}
		),
		create: jest.fn().mockResolvedValue({
			id: 3,
			title: 'New Thing',
			status: 'active',
		}),
		update: jest.fn().mockResolvedValue({
			id: 1,
			title: 'Updated Thing',
			status: 'active',
		}),
		remove: jest.fn().mockResolvedValue(undefined),
		useGet: jest.fn(),
		useList: jest.fn(),
		prefetchGet: jest.fn().mockResolvedValue(undefined),
		prefetchList: jest.fn().mockResolvedValue(undefined),
		invalidate: jest.fn(),
		key: jest.fn(),
		store: {} as ResourceObject<MockThing, MockThingQuery>['store'],
		select: {
			item: jest.fn().mockReturnValue(undefined),
			items: jest.fn().mockReturnValue([]),
			list: jest.fn().mockReturnValue([]),
		},
		get: {
			item: jest.fn().mockResolvedValue(
				listResponse.items[0] ?? {
					id: 1,
					title: 'Thing One',
					status: 'active',
				}
			),
			list: jest.fn().mockResolvedValue(listResponse),
		},
		mutate: {
			create: jest.fn().mockResolvedValue({
				id: 3,
				title: 'New Thing',
				status: 'active',
			}),
			update: jest.fn().mockResolvedValue({
				id: 1,
				title: 'Updated Thing',
				status: 'active',
			}),
			remove: jest.fn().mockResolvedValue(undefined),
		},
		cache: {
			prefetch: {
				item: jest.fn().mockResolvedValue(undefined),
				list: jest.fn().mockResolvedValue(undefined),
			},
			invalidate: {
				item: jest.fn(),
				list: jest.fn(),
				all: jest.fn(),
			},
			key: jest.fn(),
		},
		storeApi: {
			key: storeNamespace,
			descriptor: {} as ResourceObject<
				MockThing,
				MockThingQuery
			>['storeApi']['descriptor'],
		},
		events: {
			created: `${eventNamespace}.created`,
			updated: `${eventNamespace}.updated`,
			removed: `${eventNamespace}.removed`,
		},
	} as ResourceObject<MockThing, MockThingQuery>;

	const resource = mergeResource(baseResource, override);

	resource.key = override?.key ?? createCacheKey(resource);

	return {
		resource,
		listResponse,
	};
};

export const createResourceDataHarness = (
	overrides: WordPressHarnessOverrides = {}
): ResourceHarnessSetup => {
	const dataOverrides = overrides.data ?? {};
	const dispatch =
		(dataOverrides.dispatch as jest.Mock | undefined) ?? jest.fn();
	const select = (dataOverrides.select as jest.Mock | undefined) ?? jest.fn();
	const register =
		(dataOverrides.register as jest.Mock | undefined) ?? jest.fn();
	const createReduxStore =
		(dataOverrides.createReduxStore as jest.Mock | undefined) ?? jest.fn();
	const resolveSelect =
		(dataOverrides.resolveSelect as jest.Mock | undefined) ?? jest.fn();

	const harness = createWordPressTestHarness({
		...overrides,
		data: {
			...dataOverrides,
			dispatch,
			select,
			register,
			createReduxStore,
			resolveSelect,
		},
	});

	return {
		harness,
		data: harness.data as ResourceHarnessSetup['data'],
		dispatch,
		select,
		register,
		createReduxStore,
		resolveSelect,
	};
};

export { withWordPressData, createApiFetchHarness };

export type {
	WithWordPressDataOptions,
	ApiFetchHarness,
	ApiFetchHarnessOptions,
};
