import {
	createClass,
	createClassMethod,
	createDocComment,
	createFullyQualifiedName,
	createIdentifier,
	createName,
	type PhpAttrGroup,
	type PhpAttributes,
	type PhpName,
	type PhpParam,
	type PhpStmt,
	type PhpStmtClass,
	type PhpStmtClassMethod,
	type PhpClassStmt,
	type PhpType,
} from './nodes';
import { createPrintable, type PhpPrintable } from './printables';
import { formatClassModifiers } from './modifiers';

export const PHP_INDENT = '        ';

export type PhpMethodTemplate = string[] & {
	readonly node?: PhpStmtClassMethod;
};

export class PhpMethodBodyBuilder {
	private readonly lines: string[] = [];

	private readonly statements: PhpStmt[] = [];

	public constructor(
		private readonly indentUnit: string,
		private readonly indentLevel: number
	) {}

	public line(content = ''): void {
		if (content === '') {
			this.lines.push('');
			return;
		}

		const indent = this.indentUnit.repeat(this.indentLevel);
		this.lines.push(`${indent}${content}`);
	}

	public raw(content: string): void {
		this.lines.push(content);
	}

	public blank(): void {
		this.lines.push('');
	}

	public statement(
		printable: PhpPrintable<PhpStmt>,
		options: { applyIndent?: boolean } = {}
	): void {
		const { applyIndent = false } = options;
		const indent = this.indentUnit.repeat(this.indentLevel);

		for (const line of printable.lines) {
			if (applyIndent) {
				if (line === '') {
					this.lines.push('');
				} else {
					this.lines.push(`${indent}${line}`);
				}
			} else {
				this.lines.push(line);
			}
		}

		this.statements.push(printable.node);
	}

	public toLines(): string[] {
		return [...this.lines];
	}

	public toStatements(): PhpStmt[] {
		return [...this.statements];
	}
}

export interface PhpMethodTemplateAstOptions {
	readonly name?: string;
	readonly flags?: number;
	readonly byRef?: boolean;
	readonly params?: PhpParam[];
	readonly returnType?: PhpType | null;
	readonly attrGroups?: PhpAttrGroup[];
	readonly attributes?: PhpAttributes;
}

export interface PhpMethodTemplateOptions {
	signature: string;
	indentLevel: number;
	docblock?: string[];
	indentUnit?: string;
	body: (body: PhpMethodBodyBuilder) => void;
	ast?: PhpMethodTemplateAstOptions;
}

export function createMethodTemplate(
	options: PhpMethodTemplateOptions
): PhpMethodTemplate {
	const indentUnit = options.indentUnit ?? PHP_INDENT;
	const indent = indentUnit.repeat(options.indentLevel);
	const lines: string[] = [];

	if (options.docblock?.length) {
		lines.push(`${indent}/**`);
		for (const docLine of options.docblock) {
			lines.push(`${indent} * ${docLine}`);
		}
		lines.push(`${indent} */`);
	}

	lines.push(`${indent}${options.signature}`);
	lines.push(`${indent}{`);

	const bodyBuilder = new PhpMethodBodyBuilder(
		indentUnit,
		options.indentLevel + 1
	);
	options.body(bodyBuilder);
	const bodyLines = bodyBuilder.toLines();
	if (bodyLines.length > 0) {
		lines.push(...bodyLines);
	}

	lines.push(`${indent}}`);

	const methodNode = createMethodNode(options, bodyBuilder.toStatements());

	const template = Object.assign([...lines], {
		node: methodNode,
	}) as PhpMethodTemplate;

	return template;
}

function createMethodNode(
	options: PhpMethodTemplateOptions,
	bodyStatements: PhpStmt[]
): PhpStmtClassMethod {
	const astOptions = options.ast ?? {};
	const methodName =
		astOptions.name ?? inferMethodName(options.signature) ?? 'method';

	const methodAttributes = mergeAttributes(
		astOptions.attributes,
		options.docblock
	);

	return createClassMethod(
		createIdentifier(methodName),
		{
			byRef: astOptions.byRef ?? false,
			flags: astOptions.flags ?? 0,
			params: astOptions.params ?? [],
			returnType: astOptions.returnType ?? null,
			stmts: bodyStatements.length > 0 ? bodyStatements : [],
			attrGroups: astOptions.attrGroups ?? [],
		},
		methodAttributes
	);
}

function mergeAttributes(
	attributes: PhpAttributes | undefined,
	docblock: readonly string[] | undefined
): PhpAttributes | undefined {
	if (!docblock?.length) {
		return attributes;
	}

	const docComment = createDocComment(docblock);

	if (!attributes) {
		return { comments: [docComment] };
	}

	const existingComments = Array.isArray(
		(attributes as { comments?: unknown }).comments
	)
		? ([
				...((
					attributes as {
						comments?: unknown;
					}
				).comments as unknown[]),
				docComment,
			] as unknown[])
		: [docComment];

	return {
		...attributes,
		comments: existingComments,
	} as PhpAttributes;
}

function inferMethodName(signature: string): string | null {
	const match = signature.match(/function\s+&?\s*([a-zA-Z0-9_]+)/u);
	if (!match) {
		return null;
	}

	return match[1] ?? null;
}

export interface PhpClassTemplateOptions {
	readonly name: string;
	readonly flags?: number;
	readonly docblock?: readonly string[];
	readonly extends?: PhpName | string | readonly string[] | null;
	readonly implements?: ReadonlyArray<PhpName | string | readonly string[]>;
	readonly methods?: readonly PhpMethodTemplate[];
	readonly members?: readonly PhpPrintable<PhpClassStmt>[];
	readonly attrGroups?: readonly PhpAttrGroup[];
	readonly attributes?: PhpAttributes;
}

export type PhpClassTemplate = PhpPrintable<PhpStmtClass>;

export function createClassTemplate(
	options: PhpClassTemplateOptions
): PhpClassTemplate {
	const docblock = options.docblock ?? [];
	const methods = options.methods ?? [];

	const classAttributes = mergeAttributes(options.attributes, docblock);

	const extendsName = normaliseName(options.extends);
	const implementsNames = (options.implements ?? [])
		.map(normaliseName)
		.filter((name): name is PhpName => Boolean(name));

	const classMembers = options.members ?? [];
	const classNode = createClass(
		createIdentifier(options.name),
		{
			flags: options.flags ?? 0,
			extends: extendsName,
			implements: implementsNames,
			stmts: [
				...classMembers.map((member) => member.node),
				...methods
					.map((method) => method.node)
					.filter((node): node is PhpStmtClassMethod =>
						Boolean(node)
					),
			],
			attrGroups: options.attrGroups ? [...options.attrGroups] : [],
		},
		classAttributes
	);

	const lines: string[] = [];

	if (docblock.length > 0) {
		lines.push('/**');
		for (const line of docblock) {
			lines.push(` * ${line}`);
		}
		lines.push(' */');
	}

	const modifiers = formatClassModifiers(options.flags ?? 0);
	const signature = [
		...modifiers,
		'class',
		options.name,
		formatExtendsClause(extendsName),
		formatImplementsClause(implementsNames),
	]
		.filter((part) => part.length > 0)
		.join(' ');

	lines.push(signature);
	lines.push('{');

	classMembers.forEach((member, index) => {
		member.lines.forEach((line) => lines.push(line));

		const needsSpacing =
			index < classMembers.length - 1 || methods.length > 0;
		if (needsSpacing && member.lines[member.lines.length - 1] !== '') {
			lines.push('');
		}
	});

	methods.forEach((method, index) => {
		method.forEach((line) => lines.push(line));

		if (index < methods.length - 1) {
			lines.push('');
		}
	});

	lines.push('}');

	return createPrintable(classNode, lines);
}

function normaliseName(
	value: PhpClassTemplateOptions['extends']
): PhpName | null {
	if (!value) {
		return null;
	}

	if (typeof value === 'object' && 'nodeType' in value) {
		return value as PhpName;
	}

	const parts = Array.isArray(value)
		? value
		: String(value).split('\\').filter(Boolean);

	if (parts.length === 0) {
		return null;
	}

	if (typeof value === 'string' && value.startsWith('\\')) {
		return createFullyQualifiedName([...parts]);
	}

	return createName([...parts]);
}

function formatExtendsClause(name: PhpName | null): string {
	if (!name) {
		return '';
	}

	return `extends ${formatName(name)}`;
}

function formatImplementsClause(names: readonly PhpName[]): string {
	if (names.length === 0) {
		return '';
	}

	const formatted = names.map(formatName);
	return `implements ${formatted.join(', ')}`;
}

function formatName(name: PhpName): string {
	const prefix = name.nodeType === 'Name_FullyQualified' ? '\\' : '';
	return `${prefix}${name.parts.join('\\')}`;
}
