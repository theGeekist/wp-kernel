import type {
	ResourceIdentityConfig,
	ResourceQueryParams,
	ResourceStorageConfig,
	ResourceUIConfig,
} from '@wpkernel/core/resource';
import type { KernelConfigV1 } from '../config/types';

export type SchemaProvenance = 'manual' | 'auto';

export interface IRSchema {
	key: string;
	sourcePath: string;
	hash: string;
	schema: unknown;
	provenance: SchemaProvenance;
	generatedFrom?: {
		type: 'storage';
		resource: string;
	};
}

export type IRRouteTransport = 'local' | 'remote';

export interface IRRoute {
	method: string;
	path: string;
	policy?: string;
	hash: string;
	transport: IRRouteTransport;
}

export interface IRResourceCacheKey {
	segments: readonly unknown[];
	source: 'default' | 'config';
}

export interface IRWarning {
	code: string;
	message: string;
	context?: Record<string, unknown>;
}

export interface IRResource {
	name: string;
	schemaKey: string;
	schemaProvenance: SchemaProvenance;
	routes: IRRoute[];
	cacheKeys: {
		list: IRResourceCacheKey;
		get: IRResourceCacheKey;
		create?: IRResourceCacheKey;
		update?: IRResourceCacheKey;
		remove?: IRResourceCacheKey;
	};
	identity?: ResourceIdentityConfig;
	storage?: ResourceStorageConfig;
	queryParams?: ResourceQueryParams;
	ui?: ResourceUIConfig;
	hash: string;
	warnings: IRWarning[];
}

export interface IRPolicyHint {
	key: string;
	source: 'resource' | 'config';
	references: Array<{
		resource: string;
		route: string;
		transport: IRRouteTransport;
	}>;
}

export type IRPolicyScope = 'resource' | 'object';

export interface IRPolicyDefinition {
	key: string;
	capability: string;
	appliesTo: IRPolicyScope;
	binding?: string;
	source: 'map' | 'fallback';
}

export interface IRPolicyMap {
	sourcePath?: string;
	definitions: IRPolicyDefinition[];
	fallback: {
		capability: string;
		appliesTo: IRPolicyScope;
	};
	missing: string[];
	unused: string[];
	warnings: IRWarning[];
}

export interface IRBlock {
	key: string;
	directory: string;
	hasRender: boolean;
	manifestSource: string;
}

export interface IRPhpProject {
	namespace: string;
	autoload: string;
	outputDir: string;
}

export interface IRv1 {
	meta: {
		version: 1;
		namespace: string;
		sourcePath: string;
		origin: string;
		sanitizedNamespace: string;
	};
	config: KernelConfigV1;
	schemas: IRSchema[];
	resources: IRResource[];
	policies: IRPolicyHint[];
	policyMap: IRPolicyMap;
	blocks: IRBlock[];
	php: IRPhpProject;
}

export interface BuildIrOptions {
	config: KernelConfigV1;
	sourcePath: string;
	origin: string;
	namespace: string;
}
