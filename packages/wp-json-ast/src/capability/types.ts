import type { CapabilityHelperMetadata } from '../types';
import type { PhpProgram } from '@wpkernel/php-json-ast';

/**
 * @category WordPress AST
 */
export type CapabilityScope = 'resource' | 'object';

/**
 * @category WordPress AST
 */
export interface CapabilityDefinition {
	readonly key: string;
	readonly capability: string;
	readonly appliesTo: CapabilityScope;
	readonly binding?: string;
	readonly source: 'map' | 'fallback';
}

/**
 * @category WordPress AST
 */
export interface CapabilityFallback {
	readonly capability: string;
	readonly appliesTo: CapabilityScope;
}

/**
 * @category WordPress AST
 */
export interface CapabilityMapWarning {
	readonly code: string;
	readonly message: string;
	readonly context?: Record<string, unknown>;
}

/**
 * @category WordPress AST
 */
export interface CapabilityMapConfig {
	readonly sourcePath?: string;
	readonly definitions: readonly CapabilityDefinition[];
	readonly fallback: CapabilityFallback;
	readonly missing: readonly string[];
	readonly unused: readonly string[];
	readonly warnings: readonly CapabilityMapWarning[];
}

/**
 * @category WordPress AST
 */
export interface CapabilityModuleConfig {
	readonly origin: string;
	readonly namespace: string;
	readonly fileName?: string;
	readonly capabilityMap: CapabilityMapConfig;
	readonly hooks?: CapabilityModuleHooks;
}

/**
 * @category WordPress AST
 */
export interface CapabilityModuleFile {
	readonly fileName: string;
	readonly namespace: string;
	readonly docblock: readonly string[];
	readonly program: PhpProgram;
	readonly metadata: CapabilityHelperMetadata;
	readonly uses: readonly string[];
	readonly statements: readonly string[];
}

/**
 * @category WordPress AST
 */
export interface CapabilityModuleResult {
	readonly files: readonly CapabilityModuleFile[];
}

/**
 * @category WordPress AST
 */
export type CapabilityModuleWarning =
	| {
			readonly kind: 'capability-map-warning';
			readonly warning: CapabilityMapWarning;
	  }
	| {
			readonly kind: 'capability-definition-missing';
			readonly capability: string;
			readonly fallbackCapability: string;
			readonly fallbackScope: CapabilityScope;
	  }
	| {
			readonly kind: 'capability-definition-unused';
			readonly capability: string;
			readonly scope?: CapabilityScope;
	  };

/**
 * @category WordPress AST
 */
export interface CapabilityModuleHooks {
	readonly onWarning?: (warning: CapabilityModuleWarning) => void;
}
