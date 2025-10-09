import type { PhpAstBuilder, PhpFileMetadata } from './types';

interface InternalPhpFileAst {
	namespace: string;
	docblock: string[];
	uses: Set<string>;
	statements: string[];
}

export interface PhpFileAst {
	namespace: string;
	docblock: string[];
	uses: string[];
	statements: string[];
}

export class PhpFileBuilder implements PhpAstBuilder {
	private readonly ast: InternalPhpFileAst;

	public constructor(namespace: string, metadata: PhpFileMetadata) {
		this.ast = {
			namespace,
			docblock: [],
			uses: new Set<string>(),
			statements: [],
		};

		this.metadata = metadata;
	}

	private readonly metadata: PhpFileMetadata;

	public getNamespace(): string {
		return this.ast.namespace;
	}

	public setNamespace(namespace: string): void {
		this.ast.namespace = namespace;
	}

	public addUse(statement: string): void {
		if (statement.trim().length === 0) {
			return;
		}

		this.ast.uses.add(statement.trim());
	}

	public appendDocblock(line: string): void {
		this.ast.docblock.push(line);
	}

	public appendStatement(statement: string): void {
		this.ast.statements.push(statement);
	}

	public getStatements(): readonly string[] {
		return [...this.ast.statements];
	}

	public getMetadata(): PhpFileMetadata {
		return this.metadata;
	}

	public toAst(): PhpFileAst {
		return {
			namespace: this.ast.namespace,
			docblock: [...this.ast.docblock],
			uses: Array.from(this.ast.uses).sort((a, b) => a.localeCompare(b)),
			statements: [...this.ast.statements],
		};
	}
}
