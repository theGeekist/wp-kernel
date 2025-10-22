export type PhpAttributes = Readonly<Record<string, unknown>>;

export interface PhpJsonNode {
	readonly nodeType: string;
	readonly attributes: PhpAttributes;
	readonly [key: string]: unknown;
}

export interface PhpJsonProgram extends PhpJsonNode {
	readonly nodeType: 'stmt_program';
	readonly statements: readonly PhpJsonNode[];
}

export type PhpJsonNodeLike = PhpJsonNode | PhpJsonProgram;
