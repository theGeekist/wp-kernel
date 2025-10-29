import type { PhpFileMetadata as BasePhpFileMetadata } from '@wpkernel/php-json-ast';

export interface ResourceControllerRouteMetadata {
	readonly method: string;
	readonly path: string;
	readonly kind: 'list' | 'get' | 'create' | 'update' | 'remove' | 'custom';
	readonly cacheSegments?: readonly unknown[];
	readonly tags?: Readonly<Record<string, string>>;
}

export type ResourceControllerMetadata = BasePhpFileMetadata & {
	readonly kind: 'resource-controller';
	readonly name: string;
	readonly identity: {
		readonly type: 'number' | 'string';
		readonly param: string;
	};
	readonly routes: readonly ResourceControllerRouteMetadata[];
	readonly cache?: ResourceControllerCacheMetadata;
};

export type ResourceControllerCacheScope =
	ResourceControllerRouteMetadata['kind'];

export type ResourceControllerCacheOperation = 'read' | 'prime' | 'invalidate';

export interface ResourceControllerCacheEvent {
	readonly scope: ResourceControllerCacheScope;
	readonly operation: ResourceControllerCacheOperation;
	readonly segments: readonly string[];
	readonly description?: string;
}

export interface ResourceControllerCacheMetadata {
	readonly events: readonly ResourceControllerCacheEvent[];
}

export type BaseControllerMetadata = BasePhpFileMetadata & {
	readonly kind: 'base-controller';
	readonly name?: string;
};

export type PersistenceRegistryMetadata = BasePhpFileMetadata & {
	readonly kind: 'persistence-registry';
	readonly name?: string;
};

export type BlockManifestMetadata = BasePhpFileMetadata & {
	readonly kind: 'block-manifest';
	readonly name?: string;
};

export type BlockRegistrarMetadata = BasePhpFileMetadata & {
	readonly kind: 'block-registrar';
	readonly name?: string;
};

export interface CapabilityHelperDefinitionMetadata {
	readonly key: string;
	readonly capability: string;
	readonly appliesTo: 'resource' | 'object';
	readonly binding?: string;
	readonly source: 'map' | 'fallback';
}

export interface CapabilityHelperWarningMetadata {
	readonly code: string;
	readonly message: string;
	readonly context?: Record<string, unknown>;
}

export type CapabilityHelperMetadata = BasePhpFileMetadata & {
	readonly kind: 'capability-helper';
	readonly name?: string;
	readonly map: {
		readonly sourcePath?: string;
		readonly fallback: {
			readonly capability: string;
			readonly appliesTo: 'resource' | 'object';
		};
		readonly definitions: readonly CapabilityHelperDefinitionMetadata[];
		readonly missing: readonly string[];
		readonly unused: readonly string[];
		readonly warnings: readonly CapabilityHelperWarningMetadata[];
	};
};

export type IndexFileMetadata = BasePhpFileMetadata & {
	readonly kind: 'index-file';
	readonly name?: string;
};

export type WpPhpFileMetadata =
	| BaseControllerMetadata
	| PersistenceRegistryMetadata
	| BlockManifestMetadata
	| BlockRegistrarMetadata
	| CapabilityHelperMetadata
	| IndexFileMetadata
	| ResourceControllerMetadata;

export type PhpFileMetadata = WpPhpFileMetadata;
