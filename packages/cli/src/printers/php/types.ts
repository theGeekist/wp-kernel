export interface PhpFileMetadata {
	kind:
		| 'base-controller'
		| 'resource-controller'
		| 'persistence-registry'
		| 'block-manifest'
		| 'block-registrar'
		| 'policy-helper'
		| 'index-file';
	name?: string;
}

export interface PhpAstBuilder {
	getNamespace: () => string;
	setNamespace: (namespace: string) => void;
	addUse: (statement: string) => void;
	appendDocblock: (line: string) => void;
	appendStatement: (statement: string) => void;
	getStatements: () => readonly string[];
	getMetadata: () => PhpFileMetadata;
}

export interface PhpJsonNode {
	readonly nodeType: string;
	readonly attributes: Record<string, unknown>;
	readonly [key: string]: unknown;
}

export type PhpJsonAst = readonly PhpJsonNode[];
