// Duplicated CLI channel architecture for standalone operation
// This will be removed when Channel system moves to @wpkernel/core

import type { PhpStmt } from './nodes';
import type { PhpFileMetadata } from './types';
import type { PipelineContext } from './programBuilder';

interface ProgramUse {
	readonly key: string;
	readonly parts: readonly string[];
	readonly alias: string | null;
	readonly type: number;
	readonly fullyQualified: boolean;
}

export interface PhpAstContext {
	namespaceParts: string[];
	readonly docblockLines: string[];
	readonly uses: Map<string, ProgramUse>;
	readonly statements: PhpStmt[];
	readonly statementLines: string[];
	readonly statementEntries: PhpStatementEntry[];
	readonly pendingStatementLines: string[];
}

export interface PhpStatementEntry {
	readonly node: PhpStmt;
	readonly lines: readonly string[];
}

export interface PhpAstContextEntry {
	readonly key: string;
	readonly filePath: string;
	metadata: PhpFileMetadata;
	readonly context: PhpAstContext;
}

export interface PhpAstChannel {
	open: (options: {
		readonly key: string;
		readonly filePath: string;
		readonly namespace: string;
		readonly metadata: PhpFileMetadata;
	}) => PhpAstContextEntry;
	get: (key: string) => PhpAstContextEntry | undefined;
	entries: () => readonly PhpAstContextEntry[];
	reset: () => void;
}

// Channel host interface (duplicated from CLI)
interface ChannelHost {
	[key: symbol]: PhpAstChannel;
}

const PHP_AST_CHANNEL_SYMBOL = Symbol('@wpkernel/php-json-ast/context');

export function getPhpAstChannel<TContext extends PipelineContext>(
	context: TContext
): PhpAstChannel {
	const host = context as unknown as ChannelHost;
	if (!host[PHP_AST_CHANNEL_SYMBOL]) {
		host[PHP_AST_CHANNEL_SYMBOL] = createChannel();
	}
	return host[PHP_AST_CHANNEL_SYMBOL]!;
}

export function resetPhpAstChannel<TContext extends PipelineContext>(
	context: TContext
): void {
	getPhpAstChannel(context).reset();
}

function createChannel(): PhpAstChannel {
	const entries = new Map<string, PhpAstContextEntry>();

	return {
		open(options) {
			const existing = entries.get(options.key);
			if (existing) {
				return existing;
			}

			const context: PhpAstContext = {
				namespaceParts: normaliseNamespace(options.namespace),
				docblockLines: [],
				uses: new Map<string, ProgramUse>(),
				statements: [],
				statementLines: [],
				statementEntries: [],
				pendingStatementLines: [],
			};

			const entry: PhpAstContextEntry = {
				key: options.key,
				filePath: options.filePath,
				metadata: options.metadata,
				context,
			};

			entries.set(options.key, entry);
			return entry;
		},
		get(key) {
			return entries.get(key);
		},
		entries() {
			return Array.from(entries.values());
		},
		reset() {
			entries.clear();
		},
	};
}

function normaliseNamespace(namespace: string): string[] {
	return namespace
		.split('\\')
		.map((part) => part.trim())
		.filter((part) => part.length > 0);
}

export function setNamespaceParts(
	context: PhpAstContext,
	namespace: string
): void {
	context.namespaceParts = normaliseNamespace(namespace);
}

export function appendDocblockLine(context: PhpAstContext, line: string): void {
	context.docblockLines.push(line);
}

export function addUseEntry(context: PhpAstContext, use: ProgramUse): void {
	context.uses.set(use.key, use);
}

export function appendStatementLine(
	context: PhpAstContext,
	line: string
): void {
	context.statementLines.push(line);
	context.pendingStatementLines.push(line);
}

export function appendProgramStatement(
	context: PhpAstContext,
	statement: PhpStmt
): void {
	const lines = context.pendingStatementLines.length
		? [...context.pendingStatementLines]
		: [];
	context.pendingStatementLines.length = 0;
	context.statements.push(statement);
	context.statementEntries.push({ node: statement, lines });
}

export type { ProgramUse };
