import { createHelper } from '../../../helper';
import type { BuilderHelper, PipelineContext } from '../../../runtime/types';
import {
	appendDocblockLine,
	appendProgramStatement,
	appendStatementLine,
	addUseEntry,
	getPhpAstChannel,
	resetPhpAstChannel,
	setNamespaceParts,
	type PhpAstContext,
	type PhpAstContextEntry,
	type ProgramUse,
} from './context';
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
	mergeNodeAttributes,
	type PhpAttributes,
	type PhpComment,
	type PhpProgram,
	type PhpStmt,
} from './nodes';
import { AUTO_GUARD_BEGIN, AUTO_GUARD_END } from './constants';
import type { PhpAstBuilder, PhpFileMetadata } from './types';
import { getPhpBuilderChannel } from '../printers/channel';

type UseKind = 'normal' | 'function' | 'const';

const USE_KIND_TO_TYPE: Record<UseKind, number> = {
	normal: 1,
	function: 2,
	const: 3,
};

export interface PhpAstBuilderAdapter extends PhpAstBuilder {
	readonly context: PhpAstContext;
}

export interface CreatePhpProgramBuilderOptions {
	readonly key: string;
	readonly filePath: string;
	readonly namespace: string;
	readonly metadata: PhpFileMetadata;
	readonly build: (
		builder: PhpAstBuilderAdapter,
		entry: PhpAstContextEntry
	) => Promise<void> | void;
}

export function createPhpProgramBuilder(
	options: CreatePhpProgramBuilderOptions
): BuilderHelper {
	return createHelper({
		key: `builder.generate.php.ast.program.${options.key}`,
		kind: 'builder',
		async apply(applyOptions, next) {
			const { context, reporter } = applyOptions;
			const astChannel = getPhpAstChannel(context);
			const entry = astChannel.open({
				key: options.key,
				filePath: options.filePath,
				namespace: options.namespace,
				metadata: options.metadata,
			});

			const builder = createAdapter(entry);
			await options.build(builder, entry);

			const program = finaliseProgram(entry.context);
			const metadata = entry.metadata;
			getPhpBuilderChannel(context).queue({
				file: options.filePath,
				program,
				metadata,
				docblock: [...entry.context.docblockLines],
				uses: Array.from(entry.context.uses.values()).map(
					formatUseString
				),
				statements: [...entry.context.statementLines],
			});

			reporter.debug(
				'createPhpProgramBuilder: queued program helper output.',
				{
					file: options.filePath,
					namespace: builder.getNamespace(),
				}
			);

			await next?.();
		},
	});
}

export interface CreatePhpFileBuilderOptions
	extends Omit<CreatePhpProgramBuilderOptions, 'build'> {
	readonly build: (
		builder: PhpAstBuilderAdapter,
		entry: PhpAstContextEntry
	) => Promise<void> | void;
}

export function createPhpFileBuilder(
	options: CreatePhpFileBuilderOptions
): BuilderHelper {
	return createPhpProgramBuilder(options);
}

function createAdapter(entry: PhpAstContextEntry): PhpAstBuilderAdapter {
	const { context } = entry;

	return {
		context,
		getNamespace() {
			return formatNamespace(context.namespaceParts);
		},
		setNamespace(namespace: string) {
			setNamespaceParts(context, namespace);
		},
		addUse(
			statement: string,
			options: { alias?: string | null; kind?: UseKind } = {}
		) {
			const parsed = normaliseUse(statement, options);
			if (!parsed) {
				return;
			}

			addUseEntry(context, parsed);
		},
		appendDocblock(line: string) {
			appendDocblockLine(context, line);
		},
		appendStatement(statement: string) {
			appendStatementLine(context, statement);
		},
		appendProgramStatement(statement: PhpStmt) {
			appendProgramStatement(context, statement);
		},
		getStatements() {
			return [...context.statementLines];
		},
		getMetadata() {
			return entry.metadata;
		},
		getProgramAst() {
			return finaliseProgram(context);
		},
		setMetadata(metadata: PhpFileMetadata) {
			entry.metadata = metadata;
		},
	} satisfies PhpAstBuilderAdapter;
}

interface LocationSnapshot {
	readonly line: number;
	readonly filePos: number;
	readonly tokenPos: number;
}

function finaliseProgram(context: PhpAstContext): PhpProgram {
	return buildProgramLayout(context);
}

function buildProgramLayout(context: PhpAstContext): PhpStmt[] {
	const tracker = createLocationTracker();
	const program: PhpStmt[] = [];

	tracker.consumeLines(['<?php']);
	tracker.consumeLines(['']);

	const strictTypes = createDeclare([
		createDeclareItem('strict_types', createScalarInt(1)),
	]);
	const declareLocation = tracker.consumeNode(['declare(strict_types=1);']);
	program.push(mergeNodeAttributes(strictTypes, declareLocation));

	tracker.consumeLines(['']);

	let namespaceAttributes: { comments: PhpComment[] } | undefined;
	if (context.docblockLines.length > 0) {
		const docblockLines = formatDocblockLines(context.docblockLines);
		const docLocation = tracker.consumeNode(docblockLines);
		namespaceAttributes = {
			comments: [createDocComment(context.docblockLines, docLocation)],
		};
	}

	const namespaceName = context.namespaceParts.length
		? createNamespaceName(context.namespaceParts)
		: null;

	const namespaceStatements: PhpStmt[] = [];

	const namespaceStart = tracker.snapshot();

	if (namespaceName) {
		const namespaceLine = formatNamespaceLine(context.namespaceParts);
		tracker.consumeNode([namespaceLine]);
		tracker.consumeLines(['']);
	}

	const uses = getSortedUses(context);
	if (uses.length > 0) {
		for (const useEntry of uses) {
			const nameNode = useEntry.fullyQualified
				? createFullyQualifiedName([...useEntry.parts])
				: createName([...useEntry.parts]);
			const useNode = createUse(useEntry.type, [
				createUseUse(
					nameNode,
					useEntry.alias ? createIdentifier(useEntry.alias) : null
				),
			]);
			const useLine = `use ${formatUseString(useEntry)};`;
			const useLocation = tracker.consumeNode([useLine]);
			namespaceStatements.push(mergeNodeAttributes(useNode, useLocation));
		}

		tracker.consumeLines(['']);
	}

	const beginGuard = createStmtNop({
		comments: [createComment(`// ${AUTO_GUARD_BEGIN}`)],
	});
	const beginGuardText = `// ${AUTO_GUARD_BEGIN}`;
	const beginGuardLocation = tracker.consumeNode([beginGuardText]);
	namespaceStatements.push(
		mergeNodeAttributes(beginGuard, beginGuardLocation)
	);

	for (const entry of context.statementEntries) {
		const location = tracker.consumeNode(
			entry.lines.length > 0 ? entry.lines : ['']
		);
		namespaceStatements.push(mergeNodeAttributes(entry.node, location));
	}

	const endGuard = createStmtNop({
		comments: [createComment(`// ${AUTO_GUARD_END}`)],
	});
	const endGuardText = `// ${AUTO_GUARD_END}`;
	const endGuardLocation = tracker.consumeNode([endGuardText]);
	namespaceStatements.push(mergeNodeAttributes(endGuard, endGuardLocation));

	const namespaceEnd = tracker.snapshotPreviousLine();

	const namespaceNode = createNamespace(
		namespaceName,
		namespaceStatements,
		namespaceAttributes
	);

	const namespaceLocation = resolveNamespaceLocation(
		namespaceStart,
		namespaceEnd
	);

	program.push(mergeNodeAttributes(namespaceNode, namespaceLocation));

	return program;
}

function formatNamespaceLine(parts: readonly string[]): string {
	return `namespace ${parts.join('\\')};`;
}

function formatDocblockLines(lines: readonly string[]): string[] {
	if (lines.length === 0) {
		return [];
	}

	const formatted = ['/**'];
	for (const line of lines) {
		formatted.push(` * ${line}`);
	}
	formatted.push(' */');
	return formatted;
}

function resolveNamespaceLocation(
	start: LocationSnapshot,
	end: LocationSnapshot
): PhpAttributes {
	return {
		startLine: start.line,
		endLine: end.line,
		startFilePos:
			end.filePos >= start.filePos ? start.filePos : end.filePos,
		endFilePos: end.filePos,
		startTokenPos:
			end.tokenPos >= start.tokenPos ? start.tokenPos : end.tokenPos,
		endTokenPos: end.tokenPos,
	} satisfies PhpAttributes;
}

function createLocationTracker(): LocationTracker {
	return new LocationTracker();
}

class LocationTracker {
	private line = 1;

	private filePos = 0;

	private tokenPos = 0;

	private previousLineSnapshot: LocationSnapshot = {
		line: 1,
		filePos: 0,
		tokenPos: 0,
	};

	public consumeLines(lines: readonly string[]): void {
		for (const line of lines) {
			this.consumeLine(line);
		}
	}

	public consumeNode(lines: readonly string[]): PhpAttributes {
		if (lines.length === 0) {
			return this.createZeroLengthLocation();
		}

		const initialLine = this.line;
		const initialFilePos = this.filePos;
		const initialTokenPos = this.tokenPos;

		let startLine = initialLine;
		let startFilePos = initialFilePos;
		let startTokenPos = initialTokenPos;
		let endLine = initialLine;
		let endFilePos = initialFilePos;
		let endTokenPos = initialTokenPos;

		let firstContentCaptured = false;
		let lastContentLine = initialLine;
		let lastContentFilePos = initialFilePos;
		let lastContentTokenPos = initialTokenPos;

		for (const line of lines) {
			const trimmed = line.trim();
			const lineLength = line.length;

			if (!firstContentCaptured && trimmed.length > 0) {
				startLine = this.line;
				startFilePos = this.filePos;
				startTokenPos = this.tokenPos;
				firstContentCaptured = true;
			}

			if (trimmed.length > 0) {
				lastContentLine = this.line;
				lastContentFilePos = this.filePos + lineLength;
				lastContentTokenPos = this.tokenPos + lineLength;
			}

			endLine = this.line;
			endFilePos = this.filePos + lineLength;
			endTokenPos = this.tokenPos + lineLength;

			this.consumeLine(line);
		}

		if (firstContentCaptured) {
			endLine = lastContentLine;
			endFilePos = lastContentFilePos;
			endTokenPos = lastContentTokenPos;
		}

		return {
			startLine,
			endLine,
			startFilePos,
			endFilePos,
			startTokenPos,
			endTokenPos,
		} satisfies PhpAttributes;
	}

	public snapshot(): LocationSnapshot {
		return {
			line: this.line,
			filePos: this.filePos,
			tokenPos: this.tokenPos,
		};
	}

	public snapshotPreviousLine(): LocationSnapshot {
		return { ...this.previousLineSnapshot };
	}

	private consumeLine(line: string): void {
		const length = line.length;
		this.previousLineSnapshot = {
			line: this.line,
			filePos: this.filePos + length,
			tokenPos: this.tokenPos + length,
		};

		this.filePos += length + 1;
		this.tokenPos += length + 1;
		this.line += 1;
	}

	private createZeroLengthLocation(): PhpAttributes {
		return {
			startLine: this.line,
			endLine: this.line,
			startFilePos: this.filePos,
			endFilePos: this.filePos,
			startTokenPos: this.tokenPos,
			endTokenPos: this.tokenPos,
		} satisfies PhpAttributes;
	}
}

function getSortedUses(context: PhpAstContext): readonly ProgramUse[] {
	return Array.from(context.uses.values()).sort((a, b) => {
		if (a.key === b.key) {
			return 0;
		}

		return a.key < b.key ? -1 : 1;
	});
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
): { declaration: string; kind: UseKind } {
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
): { namespace: string; alias: string | null } {
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

function formatUseString(entry: ProgramUse): string {
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

function createNamespaceName(
	parts: readonly string[]
): ReturnType<typeof createName> {
	return createName([...parts]);
}

export type PhpFileAst = {
	namespace: string;
	docblock: string[];
	uses: string[];
	statements: string[];
};

export function resetPhpProgramBuilderContext(context: PipelineContext): void {
	resetPhpAstChannel(context);
}
