import type { CapabilityHelperMetadata } from '../types';
import type { PhpProgram } from '@wpkernel/php-json-ast';

export type CapabilityScope = 'resource' | 'object';

export interface CapabilityDefinition {
	readonly key: string;
	readonly capability: string;
	readonly appliesTo: CapabilityScope;
	readonly binding?: string;
	readonly source: 'map' | 'fallback';
}

export interface CapabilityFallback {
	readonly capability: string;
	readonly appliesTo: CapabilityScope;
}

export interface CapabilityMapWarning {
	readonly code: string;
	readonly message: string;
	readonly context?: Record<string, unknown>;
}

export interface CapabilityMapConfig {
	readonly sourcePath?: string;
	readonly definitions: readonly CapabilityDefinition[];
	readonly fallback: CapabilityFallback;
	readonly missing: readonly string[];
	readonly unused: readonly string[];
	readonly warnings: readonly CapabilityMapWarning[];
}

export interface CapabilityModuleConfig {
	readonly origin: string;
	readonly namespace: string;
	readonly fileName?: string;
	readonly capabilityMap: CapabilityMapConfig;
	readonly hooks?: CapabilityModuleHooks;
}

export interface CapabilityModuleFile {
	readonly fileName: string;
	readonly namespace: string;
	readonly docblock: readonly string[];
	readonly program: PhpProgram;
	readonly metadata: CapabilityHelperMetadata;
	readonly uses: readonly string[];
	readonly statements: readonly string[];
}

export interface CapabilityModuleResult {
	readonly files: readonly CapabilityModuleFile[];
}

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

export interface CapabilityModuleHooks {
	readonly onWarning?: (warning: CapabilityModuleWarning) => void;
}
