import type { Reporter } from '@wpkernel/core/reporter';
import type { ResourceConfig } from '@wpkernel/core/resource';
import type { WPKConfigSource } from '@wpkernel/core/contracts';
import type { IRv1 } from '../next/ir/publicTypes';
import type { PhpAstBuilder } from '@wpkernel/php-json-ast';

/**
 * Source identifier describing where a kernel config was loaded from.
 */
export type ConfigOrigin = WPKConfigSource;

/**
 * Currently supported kernel config schema version.
 */
export type WPKernelConfigVersion = 1;

/**
 * Configuration for a registered schema file.
 */
export interface SchemaConfig {
	path: string;
	generated: {
		types: string;
	};
	description?: string;
}

/**
 * Mapping of schema identifiers to their configuration.
 */
export interface SchemaRegistry {
	[key: string]: SchemaConfig;
}

/**
 * Mapping of resource identifiers to their kernel configuration.
 */
export interface ResourceRegistry {
	[key: string]: ResourceConfig;
}

/**
 * Optional adapters configured by a kernel project.
 */
export interface AdaptersConfig {
	php?: PhpAdapterFactory;
	extensions?: AdapterExtensionFactory[];
}

/**
 * Shape of a v1 kernel configuration object.
 */
export interface WPKernelConfigV1 {
	version: WPKernelConfigVersion;
	namespace: string;
	schemas: SchemaRegistry;
	resources: ResourceRegistry;
	adapters?: AdaptersConfig;
}

/**
 * Context shared with adapter factories while generating artifacts.
 */
export interface AdapterContext {
	config: WPKernelConfigV1;
	reporter: Reporter;
	namespace: string;
	ir?: IRv1;
}

/**
 * Configuration returned by the PHP adapter factory.
 */
export interface PhpAdapterConfig {
	namespace?: string;
	autoload?: string;
	customise?: (
		builder: PhpAstBuilder,
		context: AdapterContext & { ir: IRv1 }
	) => void;
}

/**
 * Factory for producing PHP adapter configuration.
 */
export type PhpAdapterFactory = (
	context: AdapterContext
) => PhpAdapterConfig | void;

/**
 * Execution context provided to adapter extensions.
 */
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

/**
 * Adapter extension contract.
 */
export interface AdapterExtension {
	name: string;
	apply: (context: AdapterExtensionContext) => Promise<void> | void;
}

/**
 * Factory responsible for returning adapter extensions.
 */
export type AdapterExtensionFactory = (
	context: AdapterContext
) => AdapterExtension | AdapterExtension[] | void;

/**
 * Result returned when loading and validating a kernel config file.
 */
export interface LoadedWPKernelConfig {
	config: WPKernelConfigV1;
	sourcePath: string;
	configOrigin: ConfigOrigin;
	composerCheck: 'ok' | 'mismatch';
	namespace: string;
}
