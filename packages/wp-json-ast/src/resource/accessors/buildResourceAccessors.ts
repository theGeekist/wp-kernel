import {
	type BuildResourceAccessorsOptions,
	type ResourceAccessors,
	type ResourceAccessorDescriptor,
	type ResourceAccessorMutableBuckets,
	type ResourceAccessorRegistry,
	type ResourceStorageAccessors,
	type ResourceStorageRegistration,
} from './types';

function buildBuckets(): ResourceAccessorMutableBuckets {
	return {
		requests: [],
		queries: [],
		mutations: [],
		caches: [],
		helpers: [],
	};
}

function freezeDescriptors<TValue>(
	descriptors: ResourceAccessorDescriptor<TValue>[]
): ReadonlyArray<ResourceAccessorDescriptor<TValue>> {
	return Object.freeze([...descriptors]);
}

function freezeStorageAccessors<TStorageKind extends string>(
	registration: ResourceStorageRegistration<TStorageKind>,
	buckets: ResourceAccessorMutableBuckets
): ResourceStorageAccessors<TStorageKind> {
	const storageAccessors: ResourceStorageAccessors<TStorageKind> = {
		kind: registration.kind,
		label: registration.label,
		requests: freezeDescriptors(buckets.requests),
		queries: freezeDescriptors(buckets.queries),
		mutations: freezeDescriptors(buckets.mutations),
		caches: freezeDescriptors(buckets.caches),
		helpers: freezeDescriptors(buckets.helpers),
	};

	return Object.freeze(storageAccessors);
}

function freezeDescriptor<TValue>(
	descriptor: ResourceAccessorDescriptor<TValue>
): ResourceAccessorDescriptor<TValue> {
	return Object.freeze({ ...descriptor });
}

function buildRegistry(
	buckets: ResourceAccessorMutableBuckets
): ResourceAccessorRegistry {
	return {
		addRequest(descriptor) {
			buckets.requests.push(freezeDescriptor(descriptor));
		},
		addQuery(descriptor) {
			buckets.queries.push(freezeDescriptor(descriptor));
		},
		addMutation(descriptor) {
			buckets.mutations.push(freezeDescriptor(descriptor));
		},
		addCache(descriptor) {
			buckets.caches.push(freezeDescriptor(descriptor));
		},
		addHelper(descriptor) {
			buckets.helpers.push(freezeDescriptor(descriptor));
		},
	};
}

export function buildResourceAccessors<TStorageKind extends string>(
	options: BuildResourceAccessorsOptions<TStorageKind>
): ResourceAccessors<TStorageKind> {
	const storages: ResourceStorageAccessors<TStorageKind>[] = [];
	const storagesByKind = new Map<
		TStorageKind,
		ResourceStorageAccessors<TStorageKind>
	>();

	for (const registration of options.storages) {
		if (storagesByKind.has(registration.kind)) {
			throw new Error(
				`Resource accessors already registered for kind: ${registration.kind}`
			);
		}

		const buckets = buildBuckets();
		const registry = buildRegistry(buckets);
		registration.register(registry);

		const storageAccessors = freezeStorageAccessors(registration, buckets);
		storages.push(storageAccessors);
		storagesByKind.set(registration.kind, storageAccessors);
	}

	return {
		storages: Object.freeze([...storages]),
		storagesByKind: storagesByKind as ReadonlyMap<
			TStorageKind,
			ResourceStorageAccessors<TStorageKind>
		>,
	};
}
