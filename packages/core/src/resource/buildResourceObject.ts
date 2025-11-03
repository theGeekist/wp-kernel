import { WPKernelError } from '../error/WPKernelError';
import {
	registerStoreKey,
	invalidate as globalInvalidate,
	type CacheKeyPattern,
} from './cache';
import { createStore } from './store';
import type {
	CacheKeys,
	ResourceClient,
	ResourceConfig,
	ResourceObject,
} from './types';
import {
	createSelectGetter,
	createGetGetter,
	createMutateGetter,
	createCacheGetter,
	createStoreApiGetter,
	createEventsGetter,
} from './grouped-api';
import type { Reporter } from '../reporter';
import { RESOURCE_LOG_MESSAGES } from './logMessages';

export type NormalizedResourceConfig<T, TQuery> = ResourceConfig<T, TQuery> & {
	readonly name: string;
};

interface BuildResourceObjectOptions<T, TQuery> {
	readonly config: ResourceConfig<T, TQuery>;
	readonly normalizedConfig: NormalizedResourceConfig<T, TQuery>;
	readonly namespace: string;
	readonly resourceName: string;
	readonly reporter: Reporter;
	readonly cacheKeys: Required<CacheKeys<TQuery>>;
	readonly client: ResourceClient<T, TQuery>;
}

export function buildResourceObject<T, TQuery>(
	options: BuildResourceObjectOptions<T, TQuery>
): ResourceObject<T, TQuery> {
	const {
		config,
		normalizedConfig,
		namespace,
		resourceName,
		reporter,
		cacheKeys,
		client,
	} = options;

	let store: unknown = null;
	let storeRegistered = false;
	const storeReporter = reporter.child('store');
	const cacheReporter = reporter.child('cache');

	const resource: ResourceObject<T, TQuery> = {
		...client,
		name: resourceName,
		storeKey: `${namespace}/${resourceName}`,
		cacheKeys,
		routes: config.routes,
		reporter,
		get store() {
			if (!storeRegistered) {
				registerStoreKey(resource.storeKey);

				const storeDescriptor = createStore<T, TQuery>({
					resource: resource as ResourceObject<T, TQuery>,
					reporter,
					...(config.store ?? {}),
				});

				const globalWp =
					typeof window === 'undefined'
						? undefined
						: (window as WPGlobal).wp;

				if (
					globalWp?.data?.createReduxStore &&
					globalWp?.data?.register
				) {
					storeReporter.debug(RESOURCE_LOG_MESSAGES.registerStore, {
						storeKey: resource.storeKey,
						resource: resourceName,
					});

					const reduxStore = globalWp.data.createReduxStore(
						resource.storeKey,
						{
							reducer: storeDescriptor.reducer,
							actions: storeDescriptor.actions,
							selectors: storeDescriptor.selectors,
							resolvers: storeDescriptor.resolvers,
							initialState: storeDescriptor.initialState,
							controls: storeDescriptor.controls,
						}
					);
					globalWp.data.register(reduxStore);
					storeReporter.info(RESOURCE_LOG_MESSAGES.storeRegistered, {
						storeKey: resource.storeKey,
						resource: resourceName,
					});
				}

				store = storeDescriptor;
				storeRegistered = true;
			}

			return store;
		},
		prefetchGet: config.routes.get
			? async (id: string | number) => {
					const globalWp =
						typeof window === 'undefined'
							? undefined
							: (window as WPGlobal).wp;
					if (!globalWp?.data?.dispatch) {
						throw new WPKernelError('DeveloperError', {
							message:
								'prefetchGet requires @wordpress/data to be loaded',
							context: {
								resource: config.name,
								method: 'prefetchGet',
							},
						});
					}

					void resource.store;

					const storeDispatch = globalWp.data.dispatch as (
						storeKey: string
					) => {
						getItem?: (id: string | number) => void;
					};
					const dispatch = storeDispatch(resource.storeKey);
					if (dispatch?.getItem) {
						reporter.debug(RESOURCE_LOG_MESSAGES.prefetchItem, {
							id,
							storeKey: resource.storeKey,
							resource: resourceName,
						});
						await globalWp.data
							.resolveSelect(resource.storeKey as string)
							.getItem(id);
					}
				}
			: undefined,
		prefetchList: config.routes.list
			? async (query?: TQuery) => {
					const globalWp =
						typeof window === 'undefined'
							? undefined
							: (window as WPGlobal).wp;
					if (!globalWp?.data?.dispatch) {
						throw new WPKernelError('DeveloperError', {
							message:
								'prefetchList requires @wordpress/data to be loaded',
							context: {
								resource: config.name,
								method: 'prefetchList',
							},
						});
					}

					void resource.store;

					reporter.debug(RESOURCE_LOG_MESSAGES.prefetchList, {
						query,
						storeKey: resource.storeKey,
						resource: resourceName,
					});
					await globalWp.data
						.resolveSelect(resource.storeKey as string)
						.getList(query);
				}
			: undefined,
		invalidate: (patterns: CacheKeyPattern | CacheKeyPattern[]) => {
			globalInvalidate(patterns, {
				storeKey: resource.storeKey,
				reporter: cacheReporter,
				namespace,
				resourceName,
			});
		},
		key: (
			operation: 'list' | 'get' | 'create' | 'update' | 'remove',
			params?: TQuery | string | number | Partial<T>
		): (string | number | boolean)[] => {
			const generator = cacheKeys[operation];
			const cacheKey = generator(params as never);
			return cacheKey.filter(
				(value): value is string | number | boolean =>
					value !== null && value !== undefined
			);
		},
		get select() {
			return createSelectGetter<T, TQuery>(config).call(this);
		},
		get get() {
			return createGetGetter<T, TQuery>(config).call(this);
		},
		get mutate() {
			return createMutateGetter<T, TQuery>(config).call(this);
		},
		get cache() {
			return createCacheGetter<T, TQuery>(
				normalizedConfig,
				cacheKeys
			).call(this);
		},
		get storeApi() {
			return createStoreApiGetter<T, TQuery>().call(this);
		},
		get events() {
			return createEventsGetter<T, TQuery>({
				...config,
				namespace,
				name: resourceName,
			}).call(this);
		},
	};

	const configWithUI = config as ResourceConfig<T, TQuery> & {
		readonly ui?: unknown;
	};

	if (configWithUI.ui && typeof configWithUI.ui === 'object') {
		resource.ui = configWithUI.ui as ResourceObject<T, TQuery>['ui'];
	}

	return resource;
}
