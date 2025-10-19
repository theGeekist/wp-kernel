import {
	createComment,
	createDeclare,
	createDeclareItem,
	createDocComment,
	createFullyQualifiedName,
	createIdentifier,
	createName,
	createNamespace,
	createScalarInt,
	createStmtNop,
	createUse,
	createUseUse,
	type PhpProgram,
	type PhpStmt,
} from './nodes';
import { AUTO_GUARD_BEGIN, AUTO_GUARD_END } from './constants';
import type { PhpAstBuilder, PhpFileMetadata } from './types';

interface ProgramUse {
	readonly key: string;
	readonly parts: readonly string[];
	readonly alias: string | null;
	readonly type: number;
	readonly fullyQualified: boolean;
}

type UseKind = 'normal' | 'function' | 'const';

const USE_KIND_TO_TYPE: Record<UseKind, number> = {
	normal: 1,
	function: 2,
	const: 3,
};

function normaliseNamespace(namespace: string): readonly string[] {
	return namespace
		.split('\\')
		.map((part) => part.trim())
		.filter((part) => part.length > 0);
}

function formatNamespace(parts: readonly string[]): string {
	return parts.join('\\');
}

function normaliseUse(
	statement: string,
	options: { alias?: string | null; kind?: UseKind } = {}
): ProgramUse | null {
	const trimmed = statement.trim();
	if (trimmed.length === 0) {
		return null;
	}

	const { declaration, kind } = extractUseKind(trimmed, options.kind);
	const { namespace, alias } = extractAlias(
		declaration,
		options.alias ?? null
	);
	const fullyQualified = namespace.startsWith('\\');

	const parts = namespace
		.split('\\')
		.map((part) => part.trim())
		.filter((part) => part.length > 0);

	if (parts.length === 0) {
		return null;
	}

	const key = `${USE_KIND_TO_TYPE[kind]}:${parts.join('\\')}::${alias ?? ''}`;

	return {
		key,
		parts,
		alias,
		type: USE_KIND_TO_TYPE[kind],
		fullyQualified,
	};
}

function extractUseKind(
	value: string,
	overrideKind?: UseKind
): {
	declaration: string;
	kind: UseKind;
} {
	const lower = value.toLowerCase();
	if (lower.startsWith('function ')) {
		return {
			declaration: value.slice('function '.length),
			kind: 'function',
		};
	}

	if (lower.startsWith('const ')) {
		return {
			declaration: value.slice('const '.length),
			kind: 'const',
		};
	}

	return {
		declaration: value,
		kind: overrideKind ?? 'normal',
	};
}

function extractAlias(
	value: string,
	providedAlias: string | null
): {
	namespace: string;
	alias: string | null;
} {
	if (providedAlias) {
		return {
			namespace: value.trim(),
			alias: providedAlias.trim(),
		};
	}

	const aliasMatch = value.match(/^(.*)\s+as\s+(.+)$/iu);
	if (!aliasMatch) {
		return {
			namespace: value.trim(),
			alias: null,
		};
	}

	const [, capturedNamespace, capturedAlias] = aliasMatch;
	return {
		namespace: capturedNamespace!.trim(),
		alias: capturedAlias!.trim(),
	};
}

function createUseString(entry: ProgramUse): string {
	let prefix = '';
	if (entry.type === USE_KIND_TO_TYPE.function) {
		prefix = 'function ';
	} else if (entry.type === USE_KIND_TO_TYPE.const) {
		prefix = 'const ';
	}

	const aliasSuffix = entry.alias ? ` as ${entry.alias}` : '';
	const base = `${entry.fullyQualified ? '\\' : ''}${entry.parts.join('\\')}`;

	return `${prefix}${base}${aliasSuffix}`;
}

export function createPhpProgramBuilder(namespace: string): PhpProgramBuilder {
	return new PhpProgramBuilder(namespace);
}

export class PhpProgramBuilder {
	private namespaceParts: readonly string[];

	private readonly docblockLines: string[] = [];

	private readonly uses = new Map<string, ProgramUse>();

	private readonly statements: PhpStmt[] = [];

	public constructor(namespace: string) {
		this.namespaceParts = normaliseNamespace(namespace);
	}

	public getNamespace(): string {
		return formatNamespace(this.namespaceParts);
	}

	public setNamespace(namespace: string): void {
		this.namespaceParts = normaliseNamespace(namespace);
	}

	public appendDocblock(line: string): void {
		this.docblockLines.push(line);
	}

	public getDocblock(): readonly string[] {
		return [...this.docblockLines];
	}

	public addUse(
		statement: string,
		options: { alias?: string | null; kind?: UseKind } = {}
	): void {
		const parsed = normaliseUse(statement, options);
		if (!parsed) {
			return;
		}

		this.uses.set(parsed.key, parsed);
	}

	public getUses(): readonly string[] {
		return this.getSortedUses().map(createUseString);
	}

	public appendStatement(node: PhpStmt): void {
		this.statements.push(node);
	}

	public getStatements(): readonly PhpStmt[] {
		return [...this.statements];
	}

	public toProgram(): PhpProgram {
		const program: PhpStmt[] = [];

		const strictTypes = createDeclare([
			createDeclareItem('strict_types', createScalarInt(1)),
		]);
		program.push(strictTypes);

		const namespaceAttributes = this.docblockLines.length
			? { comments: [createDocComment(this.docblockLines)] }
			: undefined;

		const namespaceName = this.namespaceParts.length
			? createNamespaceName(this.namespaceParts)
			: null;

		const namespaceStatements: PhpStmt[] = [];

		for (const useEntry of this.getSortedUses()) {
			const nameNode = useEntry.fullyQualified
				? createFullyQualifiedName([...useEntry.parts])
				: createName([...useEntry.parts]);
			const useNode = createUse(useEntry.type, [
				createUseUse(
					nameNode,
					useEntry.alias ? createIdentifier(useEntry.alias) : null
				),
			]);
			namespaceStatements.push(useNode);
		}

		const beginGuard = createStmtNop({
			comments: [createComment(`// ${AUTO_GUARD_BEGIN}`)],
		});
		namespaceStatements.push(beginGuard);

		namespaceStatements.push(...this.statements);

		const endGuard = createStmtNop({
			comments: [createComment(`// ${AUTO_GUARD_END}`)],
		});
		namespaceStatements.push(endGuard);

		const namespaceNode = createNamespace(
			namespaceName,
			namespaceStatements,
			namespaceAttributes
		);
		program.push(namespaceNode);

		return program;
	}

	private getSortedUses(): readonly ProgramUse[] {
		return Array.from(this.uses.values()).sort((a, b) => {
			if (a.key === b.key) {
				return 0;
			}

			return a.key < b.key ? -1 : 1;
		});
	}
}

function createNamespaceName(
	parts: readonly string[]
): ReturnType<typeof createName> {
	return createName([...parts]);
}

type LegacyPhpFileAst = {
	namespace: string;
	docblock: string[];
	uses: string[];
	statements: string[];
};

export type PhpFileAst = LegacyPhpFileAst;

export class PhpFileBuilder implements PhpAstBuilder {
	private readonly program: PhpProgramBuilder;

	private readonly metadata: PhpFileMetadata;

	private readonly legacyStatements: string[] = [];

	public constructor(namespace: string, metadata: PhpFileMetadata) {
		this.program = new PhpProgramBuilder(namespace);
		this.metadata = metadata;
	}

	public getNamespace(): string {
		return this.program.getNamespace();
	}

	public setNamespace(namespace: string): void {
		this.program.setNamespace(namespace);
	}

	public addUse(statement: string): void {
		this.program.addUse(statement);
	}

	public appendDocblock(line: string): void {
		this.program.appendDocblock(line);
	}

	public appendStatement(statement: string): void {
		this.legacyStatements.push(statement);
	}

	public appendProgramStatement(statement: PhpStmt): void {
		this.program.appendStatement(statement);
	}

	public getStatements(): readonly string[] {
		return [...this.legacyStatements];
	}

	public getMetadata(): PhpFileMetadata {
		return this.metadata;
	}

	public getProgramAst(): PhpProgram {
		return this.program.toProgram();
	}

	public toAst(): PhpFileAst {
		return {
			namespace: this.program.getNamespace(),
			docblock: [...this.program.getDocblock()],
			uses: [...this.program.getUses()],
			statements: [...this.legacyStatements],
		};
	}
}

export function createPhpFileBuilder(
	namespace: string,
	metadata: PhpFileMetadata
): PhpFileBuilder {
	return new PhpFileBuilder(namespace, metadata);
}
