export interface PhpFileMetadata {
	kind: 'base-controller' | 'resource-controller' | 'persistence-registry';
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
