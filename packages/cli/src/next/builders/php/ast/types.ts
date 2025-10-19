import type { PhpNode, PhpProgram, PhpStmt } from './nodes';

export interface PhpFileMetadata {
	kind:
		| 'base-controller'
		| 'resource-controller'
		| 'persistence-registry'
		| 'block-manifest'
		| 'block-registrar'
		| 'policy-helper';
	name?: string;
}

export interface PhpAstBuilder {
	getNamespace: () => string;
	setNamespace: (namespace: string) => void;
	addUse: (statement: string) => void;
	appendDocblock: (line: string) => void;
	appendStatement: (statement: string) => void;
	appendProgramStatement: (statement: PhpStmt) => void;
	getStatements: () => readonly string[];
	getMetadata: () => PhpFileMetadata;
	getProgramAst: () => PhpProgram;
}

export type PhpJsonNode = PhpNode;

export type PhpJsonAst = PhpProgram;
