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
			getPhpBuilderChannel(context).queue({
				file: options.filePath,
				program,
				metadata: options.metadata,
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
	} satisfies PhpAstBuilderAdapter;
}

function finaliseProgram(context: PhpAstContext): PhpProgram {
	const program: PhpStmt[] = [];

	const strictTypes = createDeclare([
		createDeclareItem('strict_types', createScalarInt(1)),
	]);
	program.push(strictTypes);

	const namespaceAttributes = context.docblockLines.length
		? { comments: [createDocComment(context.docblockLines)] }
		: undefined;

	const namespaceName = context.namespaceParts.length
		? createNamespaceName(context.namespaceParts)
		: null;

	const namespaceStatements: PhpStmt[] = [];

	for (const useEntry of getSortedUses(context)) {
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

	namespaceStatements.push(...context.statements);

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
