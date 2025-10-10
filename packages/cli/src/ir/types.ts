import type {
	ResourceIdentityConfig,
	ResourceQueryParams,
	ResourceStorageConfig,
} from '@geekist/wp-kernel/resource';
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

export interface IRRoute {
	method: string;
	path: string;
	policy?: string;
	hash: string;
}

export interface IRResourceCacheKey {
	segments: readonly unknown[];
	source: 'default' | 'config';
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
	hash: string;
}

export interface IRPolicyHint {
	key: string;
	source: 'resource' | 'config';
}

export interface IRBlock {
	name: string;
	directory: string;
	ssr?: boolean;
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
	blocks: IRBlock[];
	php: IRPhpProject;
}

export interface BuildIrOptions {
	config: KernelConfigV1;
	sourcePath: string;
	origin: string;
	namespace: string;
}
