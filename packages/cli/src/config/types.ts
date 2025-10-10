import type { Reporter, ResourceConfig } from '@geekist/wp-kernel';
import type { WPKConfigSource } from '@geekist/wp-kernel/namespace/constants';
import type { IRv1 } from '../ir/types';
import type { PhpAstBuilder } from '../printers/php/types';

export type ConfigOrigin = WPKConfigSource;

export type KernelConfigVersion = 1;

export interface SchemaConfig {
	path: string;
	generated: {
		types: string;
	};
	description?: string;
}

export interface SchemaRegistry {
	[key: string]: SchemaConfig;
}

export interface ResourceRegistry {
	[key: string]: ResourceConfig;
}

export interface AdaptersConfig {
	php?: PhpAdapterFactory;
	extensions?: AdapterExtensionFactory[];
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

export interface AdapterExtensionContext extends AdapterContext {
	ir: IRv1;
	outputDir: string;
	configDirectory?: string;
	tempDir: string;
	queueFile: (filePath: string, contents: string) => Promise<void>;
	updateIr: (nextIr: IRv1) => void;
	formatPhp: (filePath: string, contents: string) => Promise<string>;
	formatTs: (filePath: string, contents: string) => Promise<string>;
}

export interface AdapterExtension {
	name: string;
	apply: (context: AdapterExtensionContext) => Promise<void> | void;
}

export type AdapterExtensionFactory = (
	context: AdapterContext
) => AdapterExtension | AdapterExtension[] | void;

export interface LoadedKernelConfig {
	config: KernelConfigV1;
	sourcePath: string;
	configOrigin: ConfigOrigin;
	composerCheck: 'ok' | 'mismatch';
	namespace: string;
}
