/**
 * @category WordPress AST
 */
export interface ResourceAccessorDescriptor<TValue = unknown> {
	readonly id: string;
	readonly summary?: string;
	readonly value: TValue;
}

/**
 * @category WordPress AST
 */
/**
 * @category WordPress AST
 */
export interface ResourceAccessorBuckets {
	readonly requests: ReadonlyArray<ResourceAccessorDescriptor>;
	readonly queries: ReadonlyArray<ResourceAccessorDescriptor>;
	readonly mutations: ReadonlyArray<ResourceAccessorDescriptor>;
	readonly caches: ReadonlyArray<ResourceAccessorDescriptor>;
	readonly helpers: ReadonlyArray<ResourceAccessorDescriptor>;
}

/**
 * @category WordPress AST
 */
/**
 * @category WordPress AST
 */
export interface ResourceAccessorMutableBuckets {
	requests: ResourceAccessorDescriptor[];
	queries: ResourceAccessorDescriptor[];
	mutations: ResourceAccessorDescriptor[];
	caches: ResourceAccessorDescriptor[];
	helpers: ResourceAccessorDescriptor[];
}

/**
 * @category WordPress AST
 */
/**
 * @category WordPress AST
 */
export interface ResourceAccessorRegistry {
	addRequest: (descriptor: ResourceAccessorDescriptor) => void;
	addQuery: (descriptor: ResourceAccessorDescriptor) => void;
	addMutation: (descriptor: ResourceAccessorDescriptor) => void;
	addCache: (descriptor: ResourceAccessorDescriptor) => void;
	addHelper: (descriptor: ResourceAccessorDescriptor) => void;
}

/**
 * @category WordPress AST
 */
/**
 * @category WordPress AST
 */
export interface ResourceStorageRegistration<
	TStorageKind extends string = string,
> {
	readonly kind: TStorageKind;
	readonly label: string;
	readonly register: (registry: ResourceAccessorRegistry) => void;
}

/**
 * @category WordPress AST
 */
/**
 * @category WordPress AST
 */
export interface ResourceStorageAccessors<TStorageKind extends string = string>
	extends ResourceAccessorBuckets {
	readonly kind: TStorageKind;
	readonly label: string;
}

/**
 * @category WordPress AST
 */
/**
 * @category WordPress AST
 */
export interface BuildResourceAccessorsOptions<
	TStorageKind extends string = string,
> {
	readonly storages: ReadonlyArray<ResourceStorageRegistration<TStorageKind>>;
}

/**
 * @category WordPress AST
 */
/**
 * @category WordPress AST
 */
export interface ResourceAccessors<TStorageKind extends string = string> {
	readonly storages: ReadonlyArray<ResourceStorageAccessors<TStorageKind>>;
	readonly storagesByKind: ReadonlyMap<
		TStorageKind,
		ResourceStorageAccessors<TStorageKind>
	>;
}
