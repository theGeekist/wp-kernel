import type { Reporter } from '@geekist/wp-kernel';
import type { WPKConfigSource } from '@geekist/wp-kernel/namespace/constants';
import type { IRv1 } from '../ir/types';
import type { PhpAstBuilder } from '../printers/php/types';

export type ConfigOrigin = WPKConfigSource;

export type KernelConfigVersion = 1;

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type CacheKeyToken =
	| string
	| {
			param: string;
	  }
	| {
			literal: unknown;
	  };

export type CacheKeyTemplate = readonly CacheKeyToken[];

export interface SchemaConfig {
	path: string;
	generated: {
		types: string;
	};
	description?: string;
}

export interface RouteConfig {
	method: HttpMethod;
	path: string;
	policy?: string;
}

export interface QueryParamDescriptor {
	type: 'string' | 'enum';
	optional?: boolean;
	enum?: readonly string[];
	description?: string;
}

export interface ResourceConfig {
	name: string;
	schema: string;
	routes: {
		list: RouteConfig;
		get: RouteConfig;
		create: RouteConfig;
		update: RouteConfig;
		remove: RouteConfig;
	};
	cacheKeys: {
		list: CacheKeyTemplate;
		get: CacheKeyTemplate;
	};
	queryParams?: Record<string, QueryParamDescriptor>;
}

export interface SchemaRegistry {
	[key: string]: SchemaConfig;
}

export interface ResourceRegistry {
	[key: string]: ResourceConfig;
}

export interface AdaptersConfig {
	php?: PhpAdapterFactory;
}

export interface KernelConfigV1 {
	version: KernelConfigVersion;
	namespace: string;
	schemas: SchemaRegistry;
	resources: ResourceRegistry;
	adapters?: AdaptersConfig;
}

export interface AdapterContext {
	config: KernelConfigV1;
	reporter: Reporter;
	namespace: string;
	ir?: IRv1;
}

export interface PhpAdapterConfig {
	namespace?: string;
	autoload?: string;
	customise?: (
		builder: PhpAstBuilder,
		context: AdapterContext & { ir: IRv1 }
	) => void;
}

export type PhpAdapterFactory = (
	context: AdapterContext
) => PhpAdapterConfig | void;

export interface LoadedKernelConfig {
	config: KernelConfigV1;
	sourcePath: string;
	configOrigin: ConfigOrigin;
	composerCheck: 'ok' | 'mismatch';
	namespace: string;
}
