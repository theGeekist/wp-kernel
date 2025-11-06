import type { PersistenceRegistryMetadata } from '../types';
import type { PhpProgram } from '@wpkernel/php-json-ast';
import type {
	ResourceIdentityConfig,
	ResourceStorageConfig,
} from '@wpkernel/core/resource';

/**
 * @category WordPress AST
 */
export interface PersistenceRegistryResourceConfig {
	readonly name: string;
	readonly identity?: ResourceIdentityConfig | null;
	readonly storage?: ResourceStorageConfig | null;
}

/**
 * @category WordPress AST
 */
export interface PersistenceRegistryModuleConfig {
	readonly origin: string;
	readonly namespace: string;
	readonly resources: readonly PersistenceRegistryResourceConfig[];
	readonly fileName?: string;
}

/**
 * @category WordPress AST
 */
export interface PersistenceRegistryModuleFile {
	readonly fileName: string;
	readonly namespace: string;
	readonly docblock: readonly string[];
	readonly program: PhpProgram;
	readonly metadata: PersistenceRegistryMetadata;
	readonly uses: readonly string[];
	readonly statements: readonly string[];
}

/**
 * @category WordPress AST
 */
export interface PersistenceRegistryModuleResult {
	readonly files: readonly PersistenceRegistryModuleFile[];
}
