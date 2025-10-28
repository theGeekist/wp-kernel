import type { PolicyHelperMetadata } from '../types';
import type { PhpProgram } from '@wpkernel/php-json-ast';

export type PolicyScope = 'resource' | 'object';

export interface PolicyDefinition {
	readonly key: string;
	readonly capability: string;
	readonly appliesTo: PolicyScope;
	readonly binding?: string;
	readonly source: 'map' | 'fallback';
}

export interface PolicyFallback {
	readonly capability: string;
	readonly appliesTo: PolicyScope;
}

export interface PolicyMapWarning {
	readonly code: string;
	readonly message: string;
	readonly context?: Record<string, unknown>;
}

export interface PolicyMapConfig {
	readonly sourcePath?: string;
	readonly definitions: readonly PolicyDefinition[];
	readonly fallback: PolicyFallback;
	readonly missing: readonly string[];
	readonly unused: readonly string[];
	readonly warnings: readonly PolicyMapWarning[];
}

export interface PolicyModuleConfig {
	readonly origin: string;
	readonly namespace: string;
	readonly fileName?: string;
	readonly policyMap: PolicyMapConfig;
	readonly hooks?: PolicyModuleHooks;
}

export interface PolicyModuleFile {
	readonly fileName: string;
	readonly namespace: string;
	readonly docblock: readonly string[];
	readonly program: PhpProgram;
	readonly metadata: PolicyHelperMetadata;
	readonly uses: readonly string[];
	readonly statements: readonly string[];
}

export interface PolicyModuleResult {
	readonly files: readonly PolicyModuleFile[];
}

export type PolicyModuleWarning =
	| {
			readonly kind: 'policy-map-warning';
			readonly warning: PolicyMapWarning;
	  }
	| {
			readonly kind: 'policy-definition-missing';
			readonly policy: string;
			readonly fallbackCapability: string;
			readonly fallbackScope: PolicyScope;
	  }
	| {
			readonly kind: 'policy-definition-unused';
			readonly policy: string;
			readonly capability?: string;
			readonly scope?: PolicyScope;
	  };

export interface PolicyModuleHooks {
	readonly onWarning?: (warning: PolicyModuleWarning) => void;
}
