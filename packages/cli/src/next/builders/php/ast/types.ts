import type { PhpNode, PhpProgram, PhpStmt } from './nodes';

export interface ResourceControllerRouteMetadata {
	readonly method: string;
	readonly path: string;
	readonly kind: 'list' | 'get' | 'create' | 'update' | 'remove' | 'custom';
}

export interface ResourceControllerMetadata {
	readonly kind: 'resource-controller';
	readonly name: string;
	readonly identity: {
		readonly type: 'number' | 'string';
		readonly param: string;
	};
	readonly routes: readonly ResourceControllerRouteMetadata[];
	readonly cache?: ResourceControllerCacheMetadata;
}

export type ResourceControllerCacheScope =
	ResourceControllerRouteMetadata['kind'];

export type ResourceControllerCacheOperation = 'read' | 'prime' | 'invalidate';

export interface ResourceControllerCacheEvent {
	readonly scope: ResourceControllerCacheScope;
	readonly operation: ResourceControllerCacheOperation;
	readonly segments: readonly string[];
	readonly description?: string;
}

export interface ResourceControllerCacheMetadata {
	readonly events: readonly ResourceControllerCacheEvent[];
}

export interface ResourceMacroMetadata {
	readonly kind: 'resource-macro';
	readonly macro: string;
	readonly tags: Readonly<Record<string, string>>;
}

export interface GenericPhpFileMetadata {
	readonly kind:
		| 'base-controller'
		| 'persistence-registry'
		| 'block-manifest'
		| 'block-registrar'
		| 'policy-helper'
		| 'index-file';
	readonly name?: string;
}

export type PhpFileMetadata =
	| GenericPhpFileMetadata
	| ResourceControllerMetadata
	| ResourceMacroMetadata;

export interface PhpAstBuilder {
	getNamespace: () => string;
	setNamespace: (namespace: string) => void;
	addUse: (statement: string) => void;
	appendDocblock: (line: string) => void;
	appendStatement: (statement: string) => void;
	appendProgramStatement: (statement: PhpStmt) => void;
	getStatements: () => readonly string[];
	getMetadata: () => PhpFileMetadata;
	setMetadata: (metadata: PhpFileMetadata) => void;
	getProgramAst: () => PhpProgram;
}

export type PhpJsonNode = PhpNode;

export type PhpJsonAst = PhpProgram;
