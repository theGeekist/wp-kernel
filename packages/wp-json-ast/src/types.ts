import type { PhpFileMetadata as BasePhpFileMetadata } from '@wpkernel/php-json-ast';

/**
 * Metadata for a resource controller route.
 *
 * @category WordPress AST
 * @see ResourceControllerMetadata
 */
export interface ResourceControllerRouteMetadata {
	/** The HTTP method for the route. */
	readonly method: string;
	/** The path for the route. */
	readonly path: string;
	/** The kind of route. */
	readonly kind: 'list' | 'get' | 'create' | 'update' | 'remove' | 'custom';
	/** Optional cache segments for the route. */
	readonly cacheSegments?: readonly unknown[];
	/** Optional tags for the route. */
	readonly tags?: Readonly<Record<string, string>>;
}

/**
 * Metadata for resource controller helpers.
 *
 * @category WordPress AST
 * @see ResourceControllerMetadata
 */
export interface ResourceControllerHelperMetadata {
	/** The methods provided by the helper. */
	readonly methods: readonly string[];
}

/**
 * Metadata for a resource controller.
 *
 * @category WordPress AST
 */
export type ResourceControllerMetadata = BasePhpFileMetadata & {
	/** The kind of metadata. */
	readonly kind: 'resource-controller';
	/** The name of the resource. */
	readonly name: string;
	/** The identity of the resource. */
	readonly identity: {
		/** The type of the identity. */
		readonly type: 'number' | 'string';
		/** The name of the identity parameter. */
		readonly param: string;
	};
	/** The routes for the resource. */
	readonly routes: readonly ResourceControllerRouteMetadata[];
	/** Optional cache metadata for the resource. */
	readonly cache?: ResourceControllerCacheMetadata;
	/** Optional helper metadata for the resource. */
	readonly helpers?: ResourceControllerHelperMetadata;
};

/**
 * The scope of a resource controller cache event.
 *
 * @category WordPress AST
 * @see ResourceControllerCacheEvent
 */
export type ResourceControllerCacheScope =
	ResourceControllerRouteMetadata['kind'];

/**
 * The operation of a resource controller cache event.
 *
 * @category WordPress AST
 * @see ResourceControllerCacheEvent
 */
export type ResourceControllerCacheOperation = 'read' | 'prime' | 'invalidate';

/**
 * A resource controller cache event.
 *
 * @category WordPress AST
 * @see ResourceControllerCacheMetadata
 */
export interface ResourceControllerCacheEvent {
	/** The scope of the cache event. */
	readonly scope: ResourceControllerCacheScope;
	/** The operation of the cache event. */
	readonly operation: ResourceControllerCacheOperation;
	/** The cache segments for the event. */
	readonly segments: readonly string[];
	/** An optional description of the event. */
	readonly description?: string;
}

/**
 * Metadata for a resource controller's cache.
 *
 * @category WordPress AST
 * @see ResourceControllerMetadata
 */
export interface ResourceControllerCacheMetadata {
	/** The cache events. */
	readonly events: readonly ResourceControllerCacheEvent[];
}

/**
 * Metadata for a base controller.
 *
 * @category WordPress AST
 */
export type BaseControllerMetadata = BasePhpFileMetadata & {
	/** The kind of metadata. */
	readonly kind: 'base-controller';
	/** The name of the controller. */
	readonly name?: string;
};

/**
 * Metadata for a persistence registry.
 *
 * @category WordPress AST
 */
export type PersistenceRegistryMetadata = BasePhpFileMetadata & {
	/** The kind of metadata. */
	readonly kind: 'persistence-registry';
	/** The name of the registry. */
	readonly name?: string;
};

/**
 * A validation error for a block manifest.
 *
 * @category WordPress AST
 * @see BlockManifestMetadata
 */
export interface BlockManifestValidationError {
	/** The error code. */
	readonly code:
		| 'block-manifest/missing-directory'
		| 'block-manifest/invalid-directory'
		| 'block-manifest/missing-manifest'
		| 'block-manifest/invalid-manifest'
		| 'block-manifest/invalid-render';
	/** The name of the block. */
	readonly block: string;
	/** The field that failed validation. */
	readonly field: 'directory' | 'manifest' | 'render';
	/** The error message. */
	readonly message: string;
	/** The invalid value. */
	readonly value?: unknown;
}

/**
 * Metadata for a block manifest.
 *
 * @category WordPress AST
 */
export type BlockManifestMetadata = BasePhpFileMetadata & {
	/** The kind of metadata. */
	readonly kind: 'block-manifest';
	/** The name of the block. */
	readonly name?: string;
	/** Validation errors for the manifest. */
	readonly validation?: {
		/** The validation errors. */
		readonly errors: readonly BlockManifestValidationError[];
	};
};

/**
 * Metadata for a block registrar.
 *
 * @category WordPress AST
 */
export type BlockRegistrarMetadata = BasePhpFileMetadata & {
	/** The kind of metadata. */
	readonly kind: 'block-registrar';
	/** The name of the registrar. */
	readonly name?: string;
};

/**
 * Metadata for a capability helper definition.
 *
 * @category WordPress AST
 * @see CapabilityHelperMetadata
 */
export interface CapabilityHelperDefinitionMetadata {
	/** The key of the capability. */
	readonly key: string;
	/** The name of the capability. */
	readonly capability: string;
	/** The scope to which the capability applies. */
	readonly appliesTo: 'resource' | 'object';
	/** The binding for the capability. */
	readonly binding?: string;
	/** The source of the capability definition. */
	readonly source: 'map' | 'fallback';
}

/**
 * A warning for a capability helper.
 *
 * @category WordPress AST
 * @see CapabilityHelperMetadata
 */
export interface CapabilityHelperWarningMetadata {
	/** The warning code. */
	readonly code: string;
	/** The warning message. */
	readonly message: string;
	/** The context of the warning. */
	readonly context?: Record<string, unknown>;
}

/**
 * Metadata for a capability helper.
 *
 * @category WordPress AST
 */
export type CapabilityHelperMetadata = BasePhpFileMetadata & {
	/** The kind of metadata. */
	readonly kind: 'capability-helper';
	/** The name of the helper. */
	readonly name?: string;
	/** The capability map. */
	readonly map: {
		/** The path to the capability map source. */
		readonly sourcePath?: string;
		/** The fallback capability. */
		readonly fallback: {
			/** The name of the fallback capability. */
			readonly capability: string;
			/** The scope to which the fallback capability applies. */
			readonly appliesTo: 'resource' | 'object';
		};
		/** The capability definitions. */
		readonly definitions: readonly CapabilityHelperDefinitionMetadata[];
		/** Missing capabilities. */
		readonly missing: readonly string[];
		/** Unused capabilities. */
		readonly unused: readonly string[];
		/** Warnings for the capability map. */
		readonly warnings: readonly CapabilityHelperWarningMetadata[];
	};
};

/**
 * Metadata for an index file.
 *
 * @category WordPress AST
 */
export type IndexFileMetadata = BasePhpFileMetadata & {
	/** The kind of metadata. */
	readonly kind: 'index-file';
	/** The name of the file. */
	readonly name?: string;
};

/**
 * All possible WordPress PHP file metadata types.
 *
 * @category WordPress AST
 */
export type WpPhpFileMetadata =
	| BaseControllerMetadata
	| PersistenceRegistryMetadata
	| BlockManifestMetadata
	| BlockRegistrarMetadata
	| CapabilityHelperMetadata
	| IndexFileMetadata
	| ResourceControllerMetadata;

/**
 * All possible PHP file metadata types.
 *
 * @category WordPress AST
 * @deprecated Use `WpPhpFileMetadata` instead.
 */
export type PhpFileMetadata = WpPhpFileMetadata;
