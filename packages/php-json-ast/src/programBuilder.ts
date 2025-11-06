import {
	createHelper,
	type CreateHelperOptions,
	type Helper,
} from '@wpkernel/pipeline';
export { createHelper } from '@wpkernel/pipeline';
import type { Reporter } from '@wpkernel/core/reporter';

export type {
	CreateHelperOptions,
	Helper,
	HelperApplyFn,
	HelperApplyOptions,
	HelperDescriptor,
	HelperKind,
	HelperMode,
} from '@wpkernel/pipeline';
export type PipelinePhase = 'init' | 'generate' | 'apply' | `custom:${string}`;

export interface WorkspaceWriteOptions {
	readonly mode?: number;
	readonly ensureDir?: boolean;
}

export interface Workspace {
	readonly root: string;
	cwd: () => string;
	resolve: (...parts: string[]) => string;
	write: (
		file: string,
		contents: Buffer | string,
		options?: WorkspaceWriteOptions
	) => Promise<void>;
	exists: (target: string) => Promise<boolean>;
}

export interface PipelineContext {
	readonly workspace: Workspace;
	readonly phase: PipelinePhase;
	readonly reporter: Reporter;
}

export interface BuilderWriteAction {
	readonly file: string;
	readonly contents: Buffer | string;
}

export interface BuilderOutput {
	readonly actions: BuilderWriteAction[];
	queueWrite: (action: BuilderWriteAction) => void;
}

export interface BuilderInput {
	readonly phase: PipelinePhase;
	readonly options: unknown;
	readonly ir: unknown | null;
}

export type BuilderHelper<
	TContext extends PipelineContext = PipelineContext,
	TInput extends BuilderInput = BuilderInput,
	TOutput extends BuilderOutput = BuilderOutput,
> = Helper<TContext, TInput, TOutput, TContext['reporter'], 'builder'>;
type BuilderApplyOptions = Parameters<BuilderHelper['apply']>[0];
type BuilderNext = Parameters<BuilderHelper['apply']>[1];
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
import { getPhpBuilderChannel } from './builderChannel';
import {
	buildDeclare,
	buildDeclareItem,
	buildDocComment,
	buildFullyQualifiedName,
	buildIdentifier,
	buildName,
	buildNamespace,
	buildScalarInt,
	buildUse,
	buildGroupUse,
	buildUseUse,
	mergeNodeAttributes,
	type PhpAttributes,
	type PhpComment,
	type PhpProgram,
	type PhpStmt,
	type PhpStmtGroupUse,
	type PhpStmtUse,
} from './nodes';
import type { PhpAstBuilder, PhpFileMetadata } from './types';
// Export the builder channel functions for compatibility
export { getPhpBuilderChannel, resetPhpBuilderChannel } from './builderChannel';
export type { PhpBuilderChannel, PhpProgramAction } from './builderChannel';

type UseKind = 'normal' | 'function' | 'const';

const USE_KIND_TO_TYPE: Record<UseKind, number> = {
	normal: 1,
	function: 2,
	const: 3,
};

const USE_ITEM_TYPE_UNKNOWN = 0;

export interface PhpAstBuilderAdapter extends PhpAstBuilder {
	readonly context: PhpAstContext;
}

export interface CreatePhpProgramBuilderOptions<
	TContext extends PipelineContext = PipelineContext,
	TInput extends BuilderInput = BuilderInput,
	TOutput extends BuilderOutput = BuilderOutput,
> extends Pick<
		CreateHelperOptions<TContext, TInput, TOutput>,
		'dependsOn' | 'mode' | 'priority' | 'origin'
	> {
	readonly key: string;
	readonly filePath: string;
	readonly namespace: string;
	readonly metadata: PhpFileMetadata;
	readonly build: (
		builder: PhpAstBuilderAdapter,
		entry: PhpAstContextEntry
	) => Promise<void> | void;
}

export function createPhpProgramBuilder<
	TContext extends PipelineContext = PipelineContext,
	TInput extends BuilderInput = BuilderInput,
	TOutput extends BuilderOutput = BuilderOutput,
>(
	options: CreatePhpProgramBuilderOptions<TContext, TInput, TOutput>
): BuilderHelper<TContext, TInput, TOutput> {
	const {
		key,
		filePath,
		namespace,
		metadata: initialMetadata,
		build,
	} = options;

	return createHelper<
		TContext,
		TInput,
		TOutput,
		TContext['reporter'],
		'builder'
	>({
		key,
		kind: 'builder',
		apply: async (
			helperOptions: BuilderApplyOptions,
			next?: BuilderNext
		) => {
			const { reporter, context } = helperOptions;
			const astChannel = getPhpAstChannel(context);
			const entry = astChannel.open({
				key,
				filePath,
				namespace,
				metadata: initialMetadata,
			});

			const builder = createAdapter(entry);
			await build(builder, entry);

			const organisedUses = organiseUses(entry.context);
			const program = finaliseProgram(entry.context);
			const queuedMetadata = entry.metadata;

			getPhpBuilderChannel(context).queue({
				file: filePath,
				program,
				metadata: queuedMetadata,
				docblock: [...entry.context.docblockLines],
				uses: organisedUses.map(formatOrganisedUseString),
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

export interface CreatePhpFileBuilderOptions<
	TContext extends PipelineContext = PipelineContext,
	TInput extends BuilderInput = BuilderInput,
	TOutput extends BuilderOutput = BuilderOutput,
> extends Omit<
		CreatePhpProgramBuilderOptions<TContext, TInput, TOutput>,
		'build'
	> {
	readonly build: (
		builder: PhpAstBuilderAdapter,
		entry: PhpAstContextEntry
	) => Promise<void> | void;
}

export function createPhpFileBuilder<
	TContext extends PipelineContext = PipelineContext,
	TInput extends BuilderInput = BuilderInput,
	TOutput extends BuilderOutput = BuilderOutput,
>(
	options: CreatePhpFileBuilderOptions<TContext, TInput, TOutput>
): BuilderHelper<TContext, TInput, TOutput> {
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

	const strictTypes = buildDeclare([
		buildDeclareItem('strict_types', buildScalarInt(1)),
	]);
	const declareLocation = tracker.consumeNode(['declare(strict_types=1);']);
	program.push(mergeNodeAttributes(strictTypes, declareLocation));

	tracker.consumeLines(['']);

	let namespaceAttributes: { comments: PhpComment[] } | undefined;
	if (context.docblockLines.length > 0) {
		const docblockLines = formatDocblockLines(context.docblockLines);
		const docLocation = tracker.consumeNode(docblockLines);
		namespaceAttributes = {
			comments: [buildDocComment(context.docblockLines, docLocation)],
		};
	}

	const namespaceName = context.namespaceParts.length
		? buildNamespaceName(context.namespaceParts)
		: null;

	const namespaceStatements: PhpStmt[] = [];

	const namespaceStart = tracker.snapshot();

	if (namespaceName) {
		const namespaceLine = formatNamespaceLine(context.namespaceParts);
		tracker.consumeNode([namespaceLine]);
		tracker.consumeLines(['']);
	}

	const organisedUses = organiseUses(context);
	if (organisedUses.length > 0) {
		appendOrganisedUses(organisedUses, tracker, namespaceStatements);
	}

	for (const entry of context.statementEntries) {
		const location = tracker.consumeNode(
			entry.lines.length > 0 ? entry.lines : ['']
		);
		namespaceStatements.push(mergeNodeAttributes(entry.node, location));
	}

	const namespaceEnd = tracker.snapshotPreviousLine();

	const namespaceNode = buildNamespace(
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
				const firstNonWhitespaceIndex = line.search(/\S/);
				const offset =
					firstNonWhitespaceIndex < 0 ? 0 : firstNonWhitespaceIndex;
				startLine = this.line;
				startFilePos = this.filePos + offset;
				startTokenPos = this.tokenPos + offset;
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

interface OrganisedUseSingle {
	readonly kind: 'single';
	readonly sortKey: string;
	readonly type: number;
	readonly fullyQualified: boolean;
	readonly parts: readonly string[];
	readonly alias: string | null;
}

interface OrganisedUseGroupItem {
	readonly sortKey: string;
	readonly parts: readonly string[];
	readonly alias: string | null;
	readonly type: number;
}

interface OrganisedUseGroup {
	readonly kind: 'group';
	readonly sortKey: string;
	readonly type: number;
	readonly fullyQualified: boolean;
	readonly prefixParts: readonly string[];
	readonly items: readonly OrganisedUseGroupItem[];
}

type OrganisedUse = OrganisedUseSingle | OrganisedUseGroup;

interface UseGroupCandidateItem {
	readonly use: ProgramUse;
	readonly relativeParts: readonly string[];
}

interface UseGroupCandidate {
	sortKey: string;
	readonly prefixParts: readonly string[];
	readonly fullyQualified: boolean;
	readonly type: number;
	readonly items: UseGroupCandidateItem[];
}

function organiseUses(context: PhpAstContext): readonly OrganisedUse[] {
	const sorted = getSortedUses(context);
	if (sorted.length === 0) {
		return [];
	}

	const singles: OrganisedUseSingle[] = [];
	const candidates = new Map<string, UseGroupCandidate>();

	for (const use of sorted) {
		const candidate = resolveUseGroupCandidate(use);
		if (!candidate) {
			singles.push(buildSingleOrganisedUse(use));
			continue;
		}

		let group = candidates.get(candidate.key);
		if (!group) {
			group = {
				sortKey: use.key,
				prefixParts: candidate.prefixParts,
				fullyQualified: use.fullyQualified,
				type: use.type,
				items: [],
			} satisfies UseGroupCandidate;
			candidates.set(candidate.key, group);
		}

		group.items.push({
			use,
			relativeParts: candidate.relativeParts,
		});
	}

	const groups: OrganisedUseGroup[] = [];

	for (const candidate of candidates.values()) {
		if (candidate.items.length < 2) {
			const fallback = candidate.items[0];
			if (fallback) {
				singles.push(buildSingleOrganisedUse(fallback.use));
			}
			continue;
		}

		const items = candidate.items
			.map<OrganisedUseGroupItem>(({ use, relativeParts }) => ({
				sortKey: use.key,
				parts: relativeParts,
				alias: use.alias,
				type: USE_ITEM_TYPE_UNKNOWN,
			}))
			.sort(compareBySortKey);

		groups.push({
			kind: 'group',
			sortKey: candidate.sortKey,
			type: candidate.type,
			fullyQualified: candidate.fullyQualified,
			prefixParts: candidate.prefixParts,
			items,
		});
	}

	return [...singles, ...groups].sort(compareBySortKey);
}

function appendOrganisedUses(
	organisedUses: readonly OrganisedUse[],
	tracker: LocationTracker,
	namespaceStatements: PhpStmt[]
): void {
	for (const useEntry of organisedUses) {
		const useLine = `use ${formatOrganisedUseString(useEntry)};`;
		const useLocation = tracker.consumeNode([useLine]);
		const useNode = buildOrganisedUseNode(useEntry);
		namespaceStatements.push(mergeNodeAttributes(useNode, useLocation));
	}

	tracker.consumeLines(['']);
}

function buildOrganisedUseNode(
	entry: OrganisedUse
): PhpStmtUse | PhpStmtGroupUse {
	if (entry.kind === 'single') {
		const nameNode = entry.fullyQualified
			? buildFullyQualifiedName([...entry.parts])
			: buildName([...entry.parts]);
		const aliasNode = entry.alias ? buildIdentifier(entry.alias) : null;
		return buildUse(entry.type, [
			buildUseUse(nameNode, aliasNode, {
				type: USE_ITEM_TYPE_UNKNOWN,
			}),
		]);
	}

	const prefixNode = entry.fullyQualified
		? buildFullyQualifiedName([...entry.prefixParts])
		: buildName([...entry.prefixParts]);
	const itemNodes = entry.items.map((item) => {
		const itemName = buildName([...item.parts]);
		const aliasNode = item.alias ? buildIdentifier(item.alias) : null;
		return buildUseUse(itemName, aliasNode, {
			type: item.type,
		});
	});

	return buildGroupUse(entry.type, prefixNode, itemNodes);
}

function buildSingleOrganisedUse(use: ProgramUse): OrganisedUseSingle {
	return {
		kind: 'single',
		sortKey: use.key,
		type: use.type,
		fullyQualified: use.fullyQualified,
		parts: use.parts,
		alias: use.alias,
	} satisfies OrganisedUseSingle;
}

function resolveUseGroupCandidate(use: ProgramUse): {
	key: string;
	prefixParts: readonly string[];
	relativeParts: readonly string[];
} | null {
	const prefixParts = use.parts.slice(0, -1);
	if (prefixParts.length === 0) {
		return null;
	}

	const relativeParts = use.parts.slice(prefixParts.length);
	if (relativeParts.length === 0) {
		return null;
	}

	const qualifiedPrefix = use.fullyQualified
		? `\\${prefixParts.join('\\')}`
		: prefixParts.join('\\');
	const key = `${use.type}:${qualifiedPrefix}`;

	return { key, prefixParts, relativeParts };
}

function compareBySortKey<T extends { sortKey: string }>(a: T, b: T): number {
	if (a.sortKey === b.sortKey) {
		return 0;
	}

	return a.sortKey < b.sortKey ? -1 : 1;
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

function formatOrganisedUseString(entry: OrganisedUse): string {
	if (entry.kind === 'single') {
		const prefix = formatUsePrefix(entry.type);
		const aliasSuffix = entry.alias ? ` as ${entry.alias}` : '';
		const base = `${entry.fullyQualified ? '\\' : ''}${entry.parts.join('\\')}`;
		return `${prefix}${base}${aliasSuffix}`;
	}

	const prefix = formatUsePrefix(entry.type);
	const base = `${entry.fullyQualified ? '\\' : ''}${entry.prefixParts.join('\\')}`;
	const items = entry.items
		.map((item) => {
			const aliasSuffix = item.alias ? ` as ${item.alias}` : '';
			const itemPrefix = formatUsePrefix(item.type);
			return `${itemPrefix}${item.parts.join('\\')}${aliasSuffix}`;
		})
		.join(', ');

	return `${prefix}${base}\\{${items}}`;
}

function formatUsePrefix(type: number): string {
	if (type === USE_KIND_TO_TYPE.function) {
		return 'function ';
	}

	if (type === USE_KIND_TO_TYPE.const) {
		return 'const ';
	}

	return '';
}

function buildNamespaceName(
	parts: readonly string[]
): ReturnType<typeof buildName> {
	return buildName([...parts]);
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
