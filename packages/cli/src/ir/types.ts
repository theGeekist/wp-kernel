import type { KernelConfigV1 } from '../config/types';

export interface IRSchema {
	key: string;
	sourcePath: string;
	hash: string;
	schema: unknown;
}

export interface IRRoute {
	method: string;
	path: string;
	policy?: string;
	hash: string;
}

export interface IRResource {
	name: string;
	schemaKey: string;
	routes: IRRoute[];
	cacheKeys: {
		list: readonly unknown[];
		get: readonly unknown[];
	};
	queryParams?: Record<string, unknown>;
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
