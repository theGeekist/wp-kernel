import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';

import {
	buildArg,
	buildAssign,
	buildClass,
	buildClassMethod,
	buildDeclare,
	buildDeclareItem,
	buildDocComment,
	buildExpressionStatement,
	buildFullyQualifiedName,
	buildIdentifier,
	buildName,
	buildNamespace,
	buildNew,
	buildParam,
	buildPropertyFetch,
	buildReturn,
	buildScalarInt,
	buildScalarString,
	buildUse,
	buildUseUse,
	buildVariable,
	buildNode,
	type PhpProgram,
	type PhpNode,
	type PhpStmtProperty,
	type PhpStmtPropertyProperty,
} from '../../nodes';
import {
	PHP_CLASS_MODIFIER_FINAL,
	PHP_METHOD_MODIFIER_PRIVATE,
	PHP_METHOD_MODIFIER_PUBLIC,
	PHP_METHOD_MODIFIER_STATIC,
} from '../../modifiers';
import {
	serialisePhpBuilderFactoryIntent,
	type PhpBuilderFactoryIntent,
} from '../../generation/builderFactory';

jest.setTimeout(60_000);

const PACKAGE_ROOT = path.resolve(__dirname, '..', '..', '..');
const SCRIPT_PATH = path.join(
	PACKAGE_ROOT,
	'php',
	'generate-builderfactory.php'
);
const INTENT_FIXTURE_PATH = path.join(
	PACKAGE_ROOT,
	'fixtures',
	'generation',
	'BuilderFactoryIntent.json'
);
const AST_FIXTURE_PATH = path.join(
	PACKAGE_ROOT,
	'fixtures',
	'generation',
	'GeneratedDocument.ast.json'
);

const PHP_PROPERTY_MODIFIER_READONLY = 64;

interface ProcessResult {
	readonly stdout: string;
	readonly stderr: string;
	readonly exitCode: number;
}

function runBuilderFactoryProcess(
	args: readonly string[]
): Promise<ProcessResult> {
	const child = spawn('php', args, {
		cwd: PACKAGE_ROOT,
	}) as ChildProcessWithoutNullStreams;

	return new Promise((resolve, reject) => {
		let stdout = '';
		let stderr = '';

		child.stdout.on('data', (chunk: Buffer) => {
			stdout += chunk.toString();
		});

		child.stderr.on('data', (chunk: Buffer) => {
			stderr += chunk.toString();
		});

		child.on('error', reject);
		child.on('close', (code) => {
			resolve({
				stdout,
				stderr,
				exitCode: code ?? 0,
			});
		});
	});
}

async function writeIntentConfiguration(
	intent: PhpBuilderFactoryIntent
): Promise<string> {
	const serialised = serialisePhpBuilderFactoryIntent(intent);
	const directory = await fs.mkdtemp(
		path.join(os.tmpdir(), 'php-json-ast-builderfactory-')
	);
	const filePath = path.join(directory, 'intent.json');
	await fs.writeFile(filePath, serialised, 'utf8');
	return filePath;
}

function buildExpectedProgram(): PhpProgram {
	const strictTypes = buildDeclare([
		buildDeclareItem('strict_types', buildScalarInt(1)),
	]);

	const namespaceDoc = buildDocComment([
		'Prototype generated via BuilderFactory.',
	]);
	const classDoc = buildDocComment(['Example document DTO.']);
	const titleDoc = buildDocComment(['@var string']);
	const createdAtDoc = buildDocComment(['@var DateTimeImmutable']);
	const constructorDoc = buildDocComment([
		'@param string $title',
		'@param DateTimeImmutable $createdAt',
	]);
	const getTitleDoc = buildDocComment(['@return string']);
	const getCreatedAtDoc = buildDocComment(['@return DateTimeImmutable']);
	const createDraftDoc = buildDocComment(['@return self']);

	const titleProperty = buildNode<PhpStmtProperty>(
		'Stmt_Property',
		{
			flags: PHP_METHOD_MODIFIER_PRIVATE + PHP_PROPERTY_MODIFIER_READONLY,
			type: buildIdentifier('string'),
			props: [
				buildNode<PhpStmtPropertyProperty>('PropertyItem', {
					name: buildIdentifier('title'),
					default: buildScalarString('Untitled'),
				}),
			],
			attrGroups: [],
			hooks: [],
		},
		{ comments: [titleDoc] }
	);

	const createdAtProperty = buildNode<PhpStmtProperty>(
		'Stmt_Property',
		{
			flags: PHP_METHOD_MODIFIER_PRIVATE,
			type: buildFullyQualifiedName(['DateTimeImmutable']),
			props: [
				buildNode<PhpStmtPropertyProperty>('PropertyItem', {
					name: buildIdentifier('createdAt'),
					default: null,
				}),
			],
			attrGroups: [],
			hooks: [],
		},
		{ comments: [createdAtDoc] }
	);

	const constructor = buildClassMethod(
		buildIdentifier('__construct'),
		{
			flags: PHP_METHOD_MODIFIER_PUBLIC,
			params: [
				buildParam(buildVariable('title'), {
					type: buildIdentifier('string'),
				}),
				buildParam(buildVariable('createdAt'), {
					type: buildFullyQualifiedName(['DateTimeImmutable']),
				}),
			],
			stmts: [
				buildExpressionStatement(
					buildAssign(
						buildPropertyFetch(
							buildVariable('this'),
							buildIdentifier('title')
						),
						buildVariable('title')
					)
				),
				buildExpressionStatement(
					buildAssign(
						buildPropertyFetch(
							buildVariable('this'),
							buildIdentifier('createdAt')
						),
						buildVariable('createdAt')
					)
				),
			],
		},
		{ comments: [constructorDoc] }
	);

	const getTitle = buildClassMethod(
		buildIdentifier('getTitle'),
		{
			flags: PHP_METHOD_MODIFIER_PUBLIC,
			returnType: buildIdentifier('string'),
			stmts: [
				buildReturn(
					buildPropertyFetch(
						buildVariable('this'),
						buildIdentifier('title')
					)
				),
			],
		},
		{ comments: [getTitleDoc] }
	);

	const getCreatedAt = buildClassMethod(
		buildIdentifier('getCreatedAt'),
		{
			flags: PHP_METHOD_MODIFIER_PUBLIC,
			returnType: buildFullyQualifiedName(['DateTimeImmutable']),
			stmts: [
				buildReturn(
					buildPropertyFetch(
						buildVariable('this'),
						buildIdentifier('createdAt')
					)
				),
			],
		},
		{ comments: [getCreatedAtDoc] }
	);

	const createDraft = buildClassMethod(
		buildIdentifier('createDraft'),
		{
			flags: PHP_METHOD_MODIFIER_PUBLIC + PHP_METHOD_MODIFIER_STATIC,
			returnType: buildName(['self']),
			params: [
				buildParam(buildVariable('clock'), {
					type: buildFullyQualifiedName(['DateTimeImmutable']),
				}),
			],
			stmts: [
				buildReturn(
					buildNew(buildName(['self']), [
						buildArg(buildScalarString('Draft')),
						buildArg(buildVariable('clock')),
					])
				),
			],
		},
		{ comments: [createDraftDoc] }
	);

	const classNode = buildClass(
		buildIdentifier('GeneratedDocument'),
		{
			flags: PHP_CLASS_MODIFIER_FINAL,
			stmts: [
				titleProperty,
				createdAtProperty,
				constructor,
				getTitle,
				getCreatedAt,
				createDraft,
			],
			implements: [],
		},
		{ comments: [classDoc] }
	);

	const namespaceNode = buildNamespace(
		buildName(['Demo', 'Generated']),
		[
			buildUse(1, [buildUseUse(buildName(['DateTimeImmutable']))]),
			classNode,
		],
		{ comments: [namespaceDoc] }
	);

	return [strictTypes, namespaceNode];
}

function normaliseAttributes(value: unknown): Record<string, unknown> {
	if (!value || Array.isArray(value) || typeof value !== 'object') {
		return {};
	}

	const entries = Object.entries(value as Record<string, unknown>);
	if (entries.length === 0) {
		return {};
	}

	const normalised: Record<string, unknown> = {};
	for (const [key, raw] of entries) {
		if (key === 'comments' && Array.isArray(raw)) {
			normalised.comments = raw.map((comment) => {
				if (!comment || typeof comment !== 'object') {
					return comment;
				}

				const { nodeType, text } = comment as {
					nodeType?: string;
					text?: string;
				};

				return {
					nodeType: nodeType ?? 'Comment',
					text: text ?? '',
				};
			});
			continue;
		}

		normalised[key] = raw;
	}

	return normalised;
}

function isNameNodeType(nodeType: string | null): nodeType is string {
	return Boolean(
		nodeType && (nodeType === 'Name' || nodeType.startsWith('Name_'))
	);
}

function applyNameEntryNormalisation(
	nodeType: string | null,
	key: string,
	value: unknown,
	target: Record<string, unknown>
): boolean {
	if (
		key !== 'name' ||
		!isNameNodeType(nodeType) ||
		typeof value !== 'string'
	) {
		return false;
	}

	target.parts = value.split('\\');
	return true;
}

function appendMissingNameParts(
	nodeType: string | null,
	source: Record<string, unknown>,
	target: Record<string, unknown>
): void {
	if (!isNameNodeType(nodeType) || 'parts' in target) {
		return;
	}

	const { parts } = source as { parts?: unknown };
	if (Array.isArray(parts)) {
		target.parts = parts;
	}
}

function ensureAttributes(
	target: Record<string, unknown>
): Record<string, unknown> & { attributes: Record<string, unknown> } {
	const attributes = target.attributes;
	const isRecord =
		attributes &&
		typeof attributes === 'object' &&
		!Array.isArray(attributes);

	if (!isRecord) {
		target.attributes = {};
	}

	return target as Record<string, unknown> & {
		attributes: Record<string, unknown>;
	};
}

function normalisePhpNode(node: unknown): unknown {
	if (Array.isArray(node)) {
		return node.map((entry) => normalisePhpNode(entry));
	}

	if (!node || typeof node !== 'object') {
		return node;
	}

	const source = node as Record<string, unknown>;
	const nodeType =
		typeof source.nodeType === 'string' ? source.nodeType : null;
	const normalised: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(source)) {
		if (key === 'attributes') {
			normalised.attributes = normaliseAttributes(value);
			continue;
		}

		if (key === 'namespacedName' && value === null) {
			continue;
		}

		if (applyNameEntryNormalisation(nodeType, key, value, normalised)) {
			continue;
		}

		normalised[key] = normalisePhpNode(value);
	}

	appendMissingNameParts(nodeType, source, normalised);
	const normalisedWithAttributes = ensureAttributes(normalised);

	if (nodeType === 'VarLikeIdentifier') {
		return {
			...normalisedWithAttributes,
			nodeType: 'Identifier',
		} satisfies PhpNode;
	}

	return normalisedWithAttributes;
}

function normalisePhpProgram(program: PhpProgram): PhpProgram {
	return normalisePhpNode(program) as PhpProgram;
}

describe('generate-builderfactory.php', () => {
	it('produces PhpProgram payloads that mirror the TypeScript factories', async () => {
		const intentContents = await fs.readFile(INTENT_FIXTURE_PATH, 'utf8');
		const intent = JSON.parse(intentContents) as PhpBuilderFactoryIntent;
		const intentPath = await writeIntentConfiguration(intent);

		const { stdout, stderr, exitCode } = await runBuilderFactoryProcess([
			SCRIPT_PATH,
			PACKAGE_ROOT,
			'--intent',
			intentPath,
		]);

		expect(exitCode).toBe(0);
		expect(stderr).toBe('');

		const lines = stdout
			.split(/\r?\n/u)
			.map((line) => line.trim())
			.filter((line) => line.length > 0);

		expect(lines).toHaveLength(1);

		const [firstLine] = lines;
		if (!firstLine) {
			throw new Error('Expected builder factory output payload.');
		}

		const payload = JSON.parse(firstLine) as {
			file: string;
			program: PhpProgram;
		};
		const [firstFileIntent] = intent.files;
		expect(payload.file).toBe(firstFileIntent?.file);

		const expectedProgram = normalisePhpProgram(buildExpectedProgram());
		const fixtureProgram = normalisePhpProgram(
			JSON.parse(
				await fs.readFile(AST_FIXTURE_PATH, 'utf8')
			) as PhpProgram
		);
		const normalisedPayload = normalisePhpProgram(payload.program);

		expect(expectedProgram).toEqual(fixtureProgram);
		expect(normalisedPayload).toEqual(fixtureProgram);
	});
});
